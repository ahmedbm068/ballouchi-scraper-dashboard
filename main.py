
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.microsoft import EdgeChromiumDriverManager
from bs4 import BeautifulSoup
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
import traceback
import logging
import pandas as pd
import tempfile
import re

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(title="Tunisian Classifieds Scraper API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Ad(BaseModel):
    title: str
    price: Optional[float]
    category: str
    property_type: Optional[str]
    location: Optional[str]
    surface: Optional[float]
    description: Optional[str]
    contact: Optional[str]
    publication_date: Optional[str]
    url: str
    source_website: str

def setup_driver():
    edge_options = Options()
    edge_options.add_argument("--headless")
    edge_options.add_argument("--no-sandbox")
    edge_options.add_argument("--disable-dev-shm-usage")
    edge_options.add_argument("--disable-gpu")
    edge_options.add_argument("--window-size=1920,1080")
    edge_options.add_argument("--start-maximized")
    edge_options.add_argument("--ignore-certificate-errors")
    edge_options.add_argument("user-agent=Mozilla/5.0")
    service = Service(EdgeChromiumDriverManager().install())
    return webdriver.Edge(service=service, options=edge_options)

def extract_property_type(title: str) -> str:
    title_lower = title.lower()
    if "appartement" in title_lower:
        return "Appartement"
    elif "maison" in title_lower or "villa" in title_lower:
        return "Maison/Villa"
    elif "terrain" in title_lower:
        return "Terrain"
    elif "local" in title_lower or "commercial" in title_lower:
        return "Local Commercial"
    return "Autre"

def extract_surface(description: str) -> Optional[float]:
    if not description:
        return None
    try:
        matches = re.findall(r'(\d+)\s*(?:m²|m2)', description.lower())
        if matches:
            return float(matches[0])
    except:
        pass
    return None

def scrape_ballouchi(category: str = "immobilier") -> List[Ad]:
    driver = None
    ads = []
    try:
        logger.info(f"Starting scraping for category: {category}")
        driver = setup_driver()
        for page in range(6):
            url = f"https://www.ballouchi.com/annonces/{category}/" if page == 0 else f"https://www.ballouchi.com/annonces/{category}/page-{page}.html"
            logger.info(f"Accessing URL: {url}")
            driver.get(url)

            try:
                WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.ID, "product_list")))
            except:
                break

            soup = BeautifulSoup(driver.page_source, 'html.parser')
            ad_containers = soup.select("ul#product_list li.ajax_block_product")
            if not ad_containers:
                break

            for container in ad_containers:
                try:
                    title = container.find("span", itemprop="name").text.strip()
                    price_text = container.find("span", class_="ajax_prix").text.strip() if container.find("span", class_="ajax_prix") else ""
                    price_numeric = ''.join(ch for ch in price_text if ch.isdigit() or ch == '.')
                    price = float(price_numeric) if price_numeric else None
                    ad_url = container.find("a", class_="product_link")["href"]
                    if not ad_url.startswith("http"):
                        ad_url = "https://www.ballouchi.com" + ad_url
                    description = container.find("span", itemprop="description").text.strip() if container.find("span", itemprop="description") else None
                    location = container.find("span", class_="location").text.strip() if container.find("span", class_="location") else None
                    contact = container.find("span", class_="contact-info").text.strip() if container.find("span", class_="contact-info") else None
                    property_type = extract_property_type(title)
                    surface = extract_surface(description)

                    ads.append(Ad(
                        title=title,
                        price=price,
                        category=category,
                        property_type=property_type,
                        location=location,
                        surface=surface,
                        description=description,
                        contact=contact,
                        url=ad_url,
                        source_website="ballouchi.com",
                        publication_date=datetime.now().isoformat()
                    ))
                except Exception as e:
                    logger.warning(f"Failed to process one ad: {e}")
    finally:
        if driver:
            driver.quit()
    return ads

@app.get("/")
def read_root():
    return {"message": "Welcome to Tunisian Classifieds Scraper API"}

@app.post("/scrape")
async def scrape_ads(category: str = "immobilier"):
    ads = scrape_ballouchi(category)
    # Save to CSV directly
    df = pd.DataFrame([ad.dict() for ad in ads])
    df.to_csv("annonces.csv", index=False)
    return {"message": f"{len(ads)} ads scraped and saved to annonces.csv"}

@app.get("/export")
async def export_data():
    try:
        df = pd.read_csv("annonces.csv")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as temp_file:
            df.to_csv(temp_file.name, index=False)
            return FileResponse(temp_file.name, media_type="text/csv", filename="annonces.csv")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
