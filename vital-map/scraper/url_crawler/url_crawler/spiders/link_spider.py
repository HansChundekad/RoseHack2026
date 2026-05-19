import scrapy
import re
from pathlib import Path
from urllib.parse import urlparse


class LinkSpider(scrapy.Spider):
    name = "link_spider"

    custom_settings = {
        'FEEDS': {
            '../../urls.json': {
                'format': 'json',
                'overwrite': True,
            }
        }
    }

    # Hard-coded starting URLs
    start_urls = [
        #"https://www.localharvest.org/los-angeles-ca",
        #"https://www.localharvest.org/san-francisco-ca",
        "https://www.alternativesforhealing.com/business-directory/?dosrch=1&q=&wpbdp_view=search&listingfields%5B23%5D=&listingfields%5B22%5D=California",
        "https://www.wellnesscentersnearme.com/search?q=california"
    ]

    # Safety: stay on the same domain
    allowed_domains = [urlparse(u).netloc for u in start_urls]

    start_url_set = set(start_urls)

    DENY_KEYWORDS = [
        "privacy",
        "disclaimer",
        "terms",
        "return",
        "cancellation",
        "contact",
        "about",
        "what-we-do",
        "policy",
        "faq",
        "help",
        "support",
        "events",
        "products",
        "states",
        "featured",
        "claim",
        "services",
        "service",
        "articles",
        "library",
        "state",
        "magazines",
        "schools"
    ]

    ADDRESS_KEYWORDS = [
        "street", "st.", "avenue", "ave", "road", "rd.", "boulevard", "blvd",
        "lane", "ln", "city", "zip", "state", "location"
    ]

    ADDRESS_REGEX = re.compile(
        r"\d{1,5}\s+\w+(\s\w+)*\s+(st|street|rd|road|ave|avenue|blvd|boulevard|ln|lane)\b",
        re.I
    )

    def count_addresses(self, response):
        text = " ".join(response.css("body ::text").getall())
        count = len(self.ADDRESS_REGEX.findall(text))
        self.logger.info(
            "Address count calculated: url=%s count=%d text_length=%d",
            response.url, count, len(text)
        )
        return count

    def has_possible_address(self, response):
        # Get all visible text
        text = " ".join(response.css("body ::text").getall()).lower()

        # Check for keywords
        if any(k in text for k in self.ADDRESS_KEYWORDS):
            return True

        # Check for street number + type pattern
        if self.ADDRESS_REGEX.search(text):
            return True

        # Check for <address> tag
        if response.css("address"):
            return True

        return False

    def parse(self, response):
        self.logger.info(
            "parse() called: url=%s is_start_url=%s",
            response.url, response.url in self.start_url_set
        )

        if response.url not in self.start_url_set:
            address_count = self.count_addresses(response)
            will_yield = address_count < 7
            self.logger.info(
                "Checking yield condition: url=%s address_count=%d will_yield=%s",
                response.url, address_count, will_yield
            )
            if will_yield:
                self.logger.info("Yielding item: url=%s", response.url)
                yield {"url": response.url}
            else:
                self.logger.info(
                    "Skipping yield - too many addresses: url=%s address_count=%d",
                    response.url, address_count
                )

        # Always keep crawling
        links_found = 0
        links_filtered = 0
        for link in response.css("a::attr(href)").getall():
            links_found += 1
            full_url = response.urljoin(link)

            if full_url.startswith(("mailto:", "tel:", "javascript:")):
                links_filtered += 1
                continue

            if any(k in full_url.lower() for k in self.DENY_KEYWORDS):
                links_filtered += 1
                continue

            yield scrapy.Request(full_url, callback=self.parse)

        self.logger.info(
            "Link crawling stats: url=%s found=%d filtered=%d followed=%d",
            response.url, links_found, links_filtered, links_found - links_filtered
        )

    def closed(self, reason):
        spider_dir = Path(__file__).parent
        relative_path = Path("../../../urls.json")
        absolute_path = (spider_dir / relative_path).resolve()
        file_exists = absolute_path.exists()
        file_size = absolute_path.stat().st_size if file_exists else 0
        self.logger.info(
            "Spider closed: reason=%s output_path=%s file_exists=%s file_size=%d",
            reason, absolute_path, file_exists, file_size
        )
