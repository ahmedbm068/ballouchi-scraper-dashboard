/*
  # Create ads table for storing scraped classified listings

  1. New Tables
    - `ads`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `price` (numeric)
      - `category` (text, not null)
      - `location` (text)
      - `description` (text)
      - `contact` (text)
      - `publication_date` (timestamptz)
      - `url` (text, not null)
      - `source_website` (text, not null)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `ads` table
    - Add policies for authenticated users to read all ads
    - Add policies for authenticated users to insert new ads
*/

CREATE TABLE IF NOT EXISTS ads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    price numeric,
    category text NOT NULL,
    location text,
    description text,
    contact text,
    publication_date timestamptz,
    url text NOT NULL,
    source_website text NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ads"
    ON ads
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Authenticated users can insert ads"
    ON ads
    FOR INSERT
    TO authenticated
    WITH CHECK (true);