/*
  # Add columns for dashboard analytics

  1. Changes to existing tables
    - Add columns to `ads` table:
      - `property_type` (text) - For real estate type categorization
      - `surface` (numeric) - For property size analysis
      - `scraped_at` (timestamptz) - For tracking scraping timeline
      
  2. Security
    - Maintain existing RLS policies
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ads' AND column_name = 'property_type'
  ) THEN
    ALTER TABLE ads ADD COLUMN property_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ads' AND column_name = 'surface'
  ) THEN
    ALTER TABLE ads ADD COLUMN surface numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ads' AND column_name = 'scraped_at'
  ) THEN
    ALTER TABLE ads ADD COLUMN scraped_at timestamptz DEFAULT now();
  END IF;
END $$;