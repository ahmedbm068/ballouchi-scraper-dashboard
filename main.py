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
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import traceback
import logging
import platform
import pandas as pd
import json
import tempfile


logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="Tunisian Classifieds Scraper API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase setup
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Missing Supabase environment variables")

try:
    supabase: Client = create_client(supabase_url, supabase_key)
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")
    raise

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
    try:
        edge_options = Options()
        edge_options.add_argument("--headless")
        edge_options.add_argument("--no-sandbox")
        edge_options.add_argument("--disable-dev-shm-usage")
        edge_options.add_argument("--disable-gpu")
        edge_options.add_argument("--window-size=1920,1080")
        edge_options.add_argument("--start-maximized")
        edge_options.add_argument("--ignore-certificate-errors")
        edge_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                "AppleWebKit/537.36 (KHTML, like Gecko) "
                                "Chrome/112.0.0.0 Safari/537.36")
        
        service = Service(EdgeChromiumDriverManager().install())
        return webdriver.Edge(service=service, options=edge_options)
    except Exception as e:
        logger.error(f"Failed to setup Edge driver: {e}")
        logger.error(traceback.format_exc())
        raise

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
     
        import re
        matches = re.findall(r'(\d+)\s*(?:m²|m2)', description.lower())
        if matches:
            return float(matches[0])
    except:
        pass
    return None

def scrape_ballouchi(category: str = "immobilier") -> List[Ad]:
    driver = None
    try:
        logger.info(f"Starting scraping for category: {category}")
        driver = setup_driver()
        ads = []
        
        # Scrape multiple pages (first page + 5 additional pages)
        for page in range(6):
            # Construct URL based on page number
            if page == 0:
                url = f"https://www.ballouchi.com/annonces/{category}/"
            else:
                url = f"https://www.ballouchi.com/annonces/{category}/page-{page}.html"
                
            logger.info(f"Accessing URL: {url}")
            driver.get(url)
            
            try:
                WebDriverWait(driver, 20).until(
                    EC.presence_of_element_located((By.ID, "product_list"))
                )
            except Exception as e:
                logger.warning(f"No products found on page {page}, might be the last page: {e}")
                break
            
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            ad_containers = soup.select("ul#product_list li.ajax_block_product")
            logger.info(f"Found {len(ad_containers)} ad containers on page {page}")
            
            if not ad_containers:
                logger.warning(f"No ad containers found on page {page}, stopping pagination")
                break
            
            for container in ad_containers:
                try:
                    title_elem = container.find("span", itemprop="name")
                    title = title_elem.text.strip() if title_elem else "No Title"
                    
                    price_elem = container.find("span", class_="ajax_prix")
                    price_text = price_elem.text.strip() if price_elem else ""
                    try:
                        price_numeric = ''.join(ch for ch in price_text if ch.isdigit() or ch == '.')
                        price = float(price_numeric) if price_numeric else None
                    except (ValueError, AttributeError):
                        price = None
                    
                    url_elem = container.find("a", class_="product_link")
                    ad_url = url_elem['href'] if url_elem and url_elem.has_attr('href') else ""
                    # Make sure the URL is absolute
                    if ad_url and not ad_url.startswith('http'):
                        ad_url = f"https://www.ballouchi.com{ad_url}"
                    
                    desc_elem = container.find("span", itemprop="description")
                    description = desc_elem.text.strip() if desc_elem else None

                    location_elem = container.find("span", class_="location")
                    location = location_elem.text.strip() if location_elem else None

                    contact_elem = container.find("span", class_="contact-info")
                    contact = contact_elem.text.strip() if contact_elem else None

                    property_type = extract_property_type(title) if category == "immobilier" else None
                    surface = extract_surface(description) if category == "immobilier" else None

                    ad = Ad(
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
                    )
                    ads.append(ad)
                    logger.debug(f"Successfully scraped ad: {title}")
                except Exception as e:
                    logger.error(f"Error processing ad: {e}")
                    logger.error(traceback.format_exc())
                    continue
    except Exception as e:
        logger.error(f"Error during scraping: {e}")
        logger.error(traceback.format_exc())
        raise
    finally:
        if driver:
            driver.quit()
    
    logger.info(f"Total ads scraped: {len(ads)}")
    return ads

@app.get("/")
def read_root():
    return {"message": "Welcome to Tunisian Classifieds Scraper API"}

@app.get("/annonces", response_model=List[Ad])
async def get_annonces():
    try:
        response = supabase.table("ads").select("*").order('created_at', desc=True).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching annonces: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scrape")
async def scrape_ads(category: str = "immobilier"):
    try:
        logger.info(f"Starting scraping process for category: {category}")
        ads = scrape_ballouchi(category)
        
        for ad in ads:
            logger.debug(f"Inserting ad into Supabase: {ad.title}")
            supabase.table("ads").insert(ad.dict()).execute()
        
        return {"message": f"Successfully scraped {len(ads)} ads", "ads": ads}
    except Exception as e:
        logger.error(f"Error in scrape endpoint: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/export")
async def export_data(format: str = "csv"):
    try:
        response = supabase.table("ads").select("*").execute()
        data = response.data
        
        if not data:
            raise HTTPException(status_code=404, detail="No data to export")
        
        df = pd.DataFrame(data)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{format}") as temp_file:
            if format == "csv":
                df.to_csv(temp_file.name, index=False)
                media_type = "text/csv"
            elif format == "json":
                df.to_json(temp_file.name, orient="records", indent=2)
                media_type = "application/json"
            elif format == "excel":
                df.to_excel(temp_file.name, index=False)
                media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            else:
                raise HTTPException(status_code=400, detail="Unsupported format")
            
            return FileResponse(
                temp_file.name,
                media_type=media_type,
                filename=f"ads_export.{format}"
            )
    except Exception as e:
        logger.error(f"Error exporting data: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)