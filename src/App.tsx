import React, { useEffect, useState } from 'react';
import { Car, Home, Loader2, RefreshCw, Download } from 'lucide-react';
import { supabase } from './lib/supabase';

interface Ad {
  id: string;
  title: string;
  price: number | null;
  category: string;
  property_type?: string;
  location: string | null;
  surface?: number | null;
  description: string | null;
  contact: string | null;
  publication_date: string | null;
  url: string;
  source_website: string;
  created_at: string;
}

function App() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<'vehicules' | 'immobilier'>('immobilier');
  const [scraping, setScraping] = useState(false);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching ads');
    } finally {
      setLoading(false);
    }
  };

  const startScraping = async () => {
    setScraping(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8000/scrape?category=${category}`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Scraping failed. Please check the backend logs.');

      await fetchAds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scraping');
    } finally {
      setScraping(false);
    }
  };

  const exportData = async (format: 'csv' | 'json' | 'excel') => {
    try {
      const response = await fetch(`http://localhost:8000/export?format=${format}`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ads_export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Tunisian Classifieds Scraper</h1>
          
          <div className="flex items-center gap-4 mb-6">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as 'vehicules' | 'immobilier')}
              className="px-4 py-2 border rounded-md"
            >
              <option value="vehicules">Vehicles</option>
              <option value="immobilier">Real Estate</option>
            </select>
            
            <button
              onClick={startScraping}
              disabled={scraping}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {scraping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : category === 'vehicules' ? (
                <Car className="w-4 h-4" />
              ) : (
                <Home className="w-4 h-4" />
              )}
              {scraping ? 'Scraping...' : 'Start Scraping'}
            </button>

            <button
              onClick={fetchAds}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => exportData('csv')}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                <Download className="w-4 h-4 inline mr-2" />
                CSV
              </button>
              <button
                onClick={() => exportData('json')}
                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
              >
                <Download className="w-4 h-4 inline mr-2" />
                JSON
              </button>
              <button
                onClick={() => exportData('excel')}
                className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Excel
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center mt-10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : ads.length === 0 ? (
            <div className="text-gray-600 text-center mt-10">No ads found. Try scraping!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ads.map((ad) => (
                // Inside the ads.map function where you render each ad
                <div key={ad.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold mb-2">{ad.title}</h3>
                  {ad.price && (
                    <p className="text-green-600 font-bold mb-2">{ad.price} DT</p>
                  )}
                  {ad.property_type && (
                    <p className="text-gray-700 mb-2">Type: {ad.property_type}</p>
                  )}
                  {ad.location && (
                    <p className="text-gray-600 mb-2">
                      <span className="font-semibold">Location:</span> {ad.location}
                    </p>
                  )}
                  {ad.surface && (
                    <p className="text-gray-600 mb-2">
                      <span className="font-semibold">Surface:</span> {ad.surface} m²
                    </p>
                  )}
                  {ad.description && (
                    <p className="text-gray-600 mb-2 line-clamp-3">{ad.description}</p>
                  )}
                  {ad.contact && (
                    <p className="text-gray-600 mb-2">
                      <span className="font-semibold">Contact:</span> {ad.contact}
                    </p>
                  )}
                  {ad.publication_date && (
                    <p className="text-gray-500 text-sm mb-2">
                      Published: {new Date(ad.publication_date).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-gray-500">{ad.source_website}</span>
                    <a
                      href={ad.url.startsWith('http') ? ad.url : `https://www.ballouchi.com${ad.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      View Ad
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;