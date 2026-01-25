import scrapy
import re
import json
import os
from pathlib import Path
from urllib.parse import urlparse

# #region agent log
LOG_PATH = Path(__file__).parent.parent.parent.parent.parent / ".cursor" / "debug.log"
# #endregion

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
        "featured", 
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
        # #region agent log
        try:
            with open(LOG_PATH, 'a', encoding='utf-8') as f:
                f.write(json.dumps({"sessionId": "debug-session", "runId": "init", "hypothesisId": "C", "location": "link_spider.py:count_addresses", "message": "Address count calculated", "data": {"url": response.url, "address_count": count, "text_length": len(text)}, "timestamp": int(__import__('time').time() * 1000)}) + "\n")
        except: pass
        # #endregion
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
        # #region agent log
        try:
            with open(LOG_PATH, 'a', encoding='utf-8') as f:
                f.write(json.dumps({"sessionId": "debug-session", "runId": "init", "hypothesisId": "A", "location": "link_spider.py:parse", "message": "parse() called", "data": {"url": response.url, "is_start_url": response.url in self.start_url_set}, "timestamp": int(__import__('time').time() * 1000)}) + "\n")
        except: pass
        # #endregion
        
        if response.url not in self.start_url_set:
            address_count = self.count_addresses(response)
            # #region agent log
            try:
                with open(LOG_PATH, 'a', encoding='utf-8') as f:
                    f.write(json.dumps({"sessionId": "debug-session", "runId": "init", "hypothesisId": "C", "location": "link_spider.py:parse", "message": "Checking yield condition", "data": {"url": response.url, "address_count": address_count, "will_yield": address_count < 7}, "timestamp": int(__import__('time').time() * 1000)}) + "\n")
            except: pass
            # #endregion
            if address_count < 7:
                # #region agent log
                try:
                    with open(LOG_PATH, 'a', encoding='utf-8') as f:
                        f.write(json.dumps({"sessionId": "debug-session", "runId": "init", "hypothesisId": "B", "location": "link_spider.py:parse", "message": "Yielding item", "data": {"url": response.url}, "timestamp": int(__import__('time').time() * 1000)}) + "\n")
                except: pass
                # #endregion
                yield {"url": response.url}
            else:
                # #region agent log
                try:
                    with open(LOG_PATH, 'a', encoding='utf-8') as f:
                        f.write(json.dumps({"sessionId": "debug-session", "runId": "init", "hypothesisId": "C", "location": "link_spider.py:parse", "message": "Skipping yield - too many addresses", "data": {"url": response.url, "address_count": address_count}, "timestamp": int(__import__('time').time() * 1000)}) + "\n")
                except: pass
                # #endregion

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
        
        # #region agent log
        try:
            with open(LOG_PATH, 'a', encoding='utf-8') as f:
                f.write(json.dumps({"sessionId": "debug-session", "runId": "init", "hypothesisId": "D", "location": "link_spider.py:parse", "message": "Link crawling stats", "data": {"url": response.url, "links_found": links_found, "links_filtered": links_filtered, "links_followed": links_found - links_filtered}, "timestamp": int(__import__('time').time() * 1000)}) + "\n")
        except: pass
        # #endregion
    
    def closed(self, reason):
        # #region agent log
        try:
            # Check if output file exists
            spider_dir = Path(__file__).parent
            relative_path = Path("../../../urls.json")
            absolute_path = (spider_dir / relative_path).resolve()
            file_exists = absolute_path.exists()
            file_size = absolute_path.stat().st_size if file_exists else 0
            
            with open(LOG_PATH, 'a', encoding='utf-8') as f:
                f.write(json.dumps({"sessionId": "debug-session", "runId": "init", "hypothesisId": "E", "location": "link_spider.py:closed", "message": "Spider closed", "data": {"reason": str(reason), "output_path_relative": "../../../urls.json", "output_path_absolute": str(absolute_path), "file_exists": file_exists, "file_size": file_size}, "timestamp": int(__import__('time').time() * 1000)}) + "\n")
        except Exception as e:
            try:
                with open(LOG_PATH, 'a', encoding='utf-8') as f:
                    f.write(json.dumps({"sessionId": "debug-session", "runId": "init", "hypothesisId": "E", "location": "link_spider.py:closed", "message": "Spider closed - error checking file", "data": {"reason": str(reason), "error": str(e)}, "timestamp": int(__import__('time').time() * 1000)}) + "\n")
            except: pass
        # #endregion



