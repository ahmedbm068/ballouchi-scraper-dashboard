# Ballouchi.com Scraper

## Project Overview

This application is a comprehensive web scraping solution designed to extract classified advertisements from Ballouchi.com, a popular Tunisian classifieds website. The project focuses on real estate and vehicle listings, with data being stored in a Supabase database and made accessible through a REST API and a responsive web interface.

## Project Context and Objectives

This project aims to develop a scraping solution to extract classified ads published in Tunisia during January and February 2025. The project focuses primarily on real estate listings from Ballouchi.com, with data being stored and accessible through a REST API.

### Project Scope

- **Target Website**: Ballouchi.com  
- **Ad Types**: Sales and rentals (apartments, houses, land, commercial premises, etc.)  
- **Data Formats**: CSV, JSON, Excel  
- **Delivery**: REST API exposing collected data  
- **Version Control**: Git/GitHub for code tracking  

## Features

- **Multi-page Scraping**: Automatically scrapes up to 6 pages of classified ads from Ballouchi.com  
- **Category Filtering**: Supports filtering by category (Real Estate/Vehicles)  
- **Comprehensive Data Extraction**:  
  - Title  
  - Price  
  - Property Type (Apartment, house, land, commercial premises, etc.)  
  - Location (City, neighborhood)  
  - Surface Area (automatically extracted from descriptions using regex)  
  - Description  
  - Seller Contact  
  - Publication Date  
  - Original Ad URL (with absolute URL handling)  
- **Data Export**: Export data in multiple formats (CSV, JSON, Excel)  
- **Real-time Updates**: Refresh data with a single click  
- **Responsive Web Interface**: Built with React and Tailwind CSS  

## Technical Architecture

The application follows a client-server architecture:

### Backend (FastAPI)

- **Data Scraping Engine**: Uses Selenium with Microsoft Edge WebDriver and BeautifulSoup  
- **Database Integration**: Supabase (PostgreSQL) for data storage  
- **REST API**: Exposes endpoints for data retrieval, scraping initiation, and data export  

### Frontend (React + TypeScript)

- **UI Framework**: React with TypeScript  
- **Styling**: Tailwind CSS for responsive design  
- **State Management**: React hooks for local state management  
- **API Integration**: Direct integration with Supabase client and backend API  

## How the Scraper Works

### Multi-page Scraping Process

1. **Initialization**: Sets up a headless Microsoft Edge browser using Selenium  
2. **Page Iteration**: Iterates through up to 6 pages of listings:  
   - First page: `https://www.ballouchi.com/annonces/{category}/`  
   - Subsequent pages: `https://www.ballouchi.com/annonces/{category}/page-{page}.html`  
3. **Data Extraction**: For each page:  
   - Waits for the product list to load  
   - Extracts all ad containers from the page  
   - Parses each ad container to extract detailed information  
4. **Intelligent Parsing**:  
   - Extracts property types from titles using keyword matching  
   - Extracts surface area from descriptions using regex patterns  
   - Ensures all URLs are absolute by prepending the domain when necessary  
5. **Error Handling**: Implements robust error handling at multiple levels:  
   - Gracefully handles missing elements in ad containers  
   - Stops pagination if no products are found on a page  
   - Logs detailed error information for debugging  

## Technical Specifications

### 1. Data Scraping

- Uses Selenium and BeautifulSoup for data extraction  
- Extracts all key information from listings  
- Handles both real estate and vehicle categories  
- Implements intelligent property type and surface area extraction  
- Supports multi-page scraping (up to 6 pages per category)  

### 2. Data Storage

- Primary storage in Supabase (PostgreSQL)  
- Export capabilities in CSV, JSON, and Excel formats  
- Automatic timestamp tracking for all scraped ads  

### 3. REST API Development

- Built with FastAPI  
- Main endpoints:  
  - `GET /annonces` → Returns all collected ads  
  - `POST /scrape` → Initiates a new scraping session  
  - `GET /export` → Exports data in the desired format  

## Installation

### Prerequisites

- Python 3.8 or higher  
- Node.js 18 or higher  
- npm or yarn  
- Microsoft Edge WebDriver (automatically installed)  

### Backend Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd tunisian-classifieds-scraper
   ```

2. Create and activate a virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate   # On macOS/Linux
   venv\Scripts\activate      # On Windows
   ```

3. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:

   Create a `.env` file in the root directory and add:

   ```ini
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```

### Frontend Setup

1. Install Node.js dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory and add:

   ```ini
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Running the Application

1. Start the backend server:

   ```bash
   python main.py
   ```
   The API will be available at `http://localhost:8000`

2. Start the frontend development server:

   ```bash
   npm run dev
   ```
   The web interface will be available at `http://localhost:5173`

## API Documentation

### GET /

- **Description**: Welcome message  
- **Response**:

   ```json
   {
     "message": "Welcome to Tunisian Classifieds Scraper API"
   }
   ```

### GET /annonces

- **Description**: Retrieve all scraped ads  
- **Response Example**:

   ```json
   [
     {
       "id": "uuid",
       "title": "Apartment for Sale",
       "price": 250000,
       "category": "immobilier",
       "property_type": "Appartement",
       "location": "Tunis",
       "surface": 120,
       "description": "Beautiful apartment...",
       "contact": "+216 XX XXX XXX",
       "publication_date": "2025-03-19T20:14:15Z",
       "url": "https://www.ballouchi.com/...",
       "source_website": "ballouchi.com"
     }
   ]
   ```

### POST /scrape

- **Description**: Start scraping ads  
- **Query Parameters**:  
  - `category`: `"immobilier"` or `"vehicules"` (default: `"immobilier"`)  
- **Response**: Scraping status and list of scraped ads

### GET /export

- **Description**: Export ads data  
- **Query Parameters**:  
  - `format`: `"csv"`, `"json"`, or `"excel"` (default: `"csv"`)  
- **Response**: File download in the specified format

## Database Schema

```sql
CREATE TABLE ads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    price numeric,
    category text NOT NULL,
    property_type text,
    location text,
    surface numeric,
    description text,
    contact text,
    publication_date timestamptz,
    url text NOT NULL,
    source_website text NOT NULL,
    created_at timestamptz DEFAULT now()
);
```

## Future Enhancements

- Add support for more Tunisian classified websites  
- Implement scheduled scraping using background tasks  
- Add user authentication for personalized data views  
- Implement advanced filtering and search functionality  
- Add data visualization for market trends
