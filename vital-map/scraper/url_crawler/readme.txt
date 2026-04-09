- enter scraper python virtual environemnt:
source venv/scraper-venv/bin/activate

- when venv activate: test if right interpreter:
python -c "import scrapy; print(scrapy.__version__)"

- to add starting URL's:
add them directly into the hard coded list in /url_crawler/spders/link_spider.py

- to run URL scraper:
scrapy crawl link_spider -O output/urls.json

- run w/out debug spam
scrapy crawl link_spider -O output/urls.json --nolog


steps:
source venv/scraper-venv/bin/activate
cd vital-map/scraper/url_crawler/url_crawler
scrapy crawl link_spider