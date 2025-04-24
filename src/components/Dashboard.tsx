import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { supabase } from '../lib/supabase';

interface DashboardData {
  propertyTypes: { name: string; value: number }[];
  priceRanges: { range: string; count: number }[];
  surfaceRanges: { range: string; count: number }[];
  locationDistribution: { name: string; value: number }[];
  scrapingTimeline: { date: string; count: number }[];
  priceVsSurface: { price: number; surface: number; title: string }[];
  averagePriceByType: { type: string; avgPrice: number }[];
}

interface Filters {
  minPrice: number;
  maxPrice: number;
  propertyType: string;
  location: string;
  dateRange: 'all' | 'week' | 'month' | 'year';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    propertyTypes: [],
    priceRanges: [],
    surfaceRanges: [],
    locationDistribution: [],
    scrapingTimeline: [],
    priceVsSurface: [],
    averagePriceByType: []
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    minPrice: 0,
    maxPrice: 1000000,
    propertyType: 'all',
    location: 'all',
    dateRange: 'all'
  });
  const [availableFilters, setAvailableFilters] = useState({
    propertyTypes: ['all'],
    locations: ['all']
  });

  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  const fetchDashboardData = async () => {
    try {
      let query = supabase.from('ads').select('*');

      // Apply filters
      if (filters.propertyType !== 'all') {
        query = query.eq('property_type', filters.propertyType);
      }
      if (filters.location !== 'all') {
        query = query.eq('location', filters.location);
      }
      if (filters.minPrice > 0) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice < 1000000) {
        query = query.lte('price', filters.maxPrice);
      }

      const { data: ads } = await query;
      if (!ads) return;

      // Update available filters
      const uniquePropertyTypes = ['all', ...new Set(ads.map(ad => ad.property_type).filter(Boolean))];
      const uniqueLocations = ['all', ...new Set(ads.map(ad => ad.location).filter(Boolean))];
      setAvailableFilters({
        propertyTypes: uniquePropertyTypes,
        locations: uniqueLocations
      });

      // Process property types
      const propertyTypeCounts = ads.reduce((acc: Record<string, number>, ad) => {
        const type = ad.property_type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      // Process price ranges
      const priceRanges = processPriceRanges(ads);

      // Process surface ranges
      const surfaceRanges = processSurfaceRanges(ads);

      // Process locations
      const locationCounts = ads.reduce((acc: Record<string, number>, ad) => {
        const location = ad.location || 'Unknown';
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      }, {});

      // Process price vs surface scatter plot data
      const priceVsSurface = ads
        .filter(ad => ad.price && ad.surface)
        .map(ad => ({
          price: ad.price,
          surface: ad.surface,
          title: ad.title
        }));

      // Calculate average price by property type
      const averagePriceByType = Object.entries(
        ads.reduce((acc: Record<string, { sum: number; count: number }>, ad) => {
          if (ad.property_type && ad.price) {
            if (!acc[ad.property_type]) {
              acc[ad.property_type] = { sum: 0, count: 0 };
            }
            acc[ad.property_type].sum += ad.price;
            acc[ad.property_type].count += 1;
          }
          return acc;
        }, {})
      ).map(([type, { sum, count }]) => ({
        type,
        avgPrice: sum / count
      }));

      // Process scraping timeline
      const timeline = processScrapingTimeline(ads);

      setData({
        propertyTypes: Object.entries(propertyTypeCounts).map(([name, value]) => ({ name, value })),
        priceRanges,
        surfaceRanges,
        locationDistribution: Object.entries(locationCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5),
        scrapingTimeline: timeline,
        priceVsSurface,
        averagePriceByType
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processPriceRanges = (ads: any[]) => {
    const ranges = [
      { min: 0, max: 100000, label: '0-100k' },
      { min: 100000, max: 200000, label: '100k-200k' },
      { min: 200000, max: 300000, label: '200k-300k' },
      { min: 300000, max: 500000, label: '300k-500k' },
      { min: 500000, max: Infinity, label: '500k+' }
    ];

    return ranges.map(range => ({
      range: range.label,
      count: ads.filter(ad => 
        ad.price >= range.min && ad.price < range.max
      ).length
    }));
  };

  const processSurfaceRanges = (ads: any[]) => {
    const ranges = [
      { min: 0, max: 50, label: '0-50m²' },
      { min: 50, max: 100, label: '50-100m²' },
      { min: 100, max: 150, label: '100-150m²' },
      { min: 150, max: 200, label: '150-200m²' },
      { min: 200, max: Infinity, label: '200m²+' }
    ];

    return ranges.map(range => ({
      range: range.label,
      count: ads.filter(ad => 
        ad.surface >= range.min && ad.surface < range.max
      ).length
    }));
  };

  const processScrapingTimeline = (ads: any[]) => {
    const timelineCounts = ads.reduce((acc: Record<string, number>, ad) => {
      const date = new Date(ad.scraped_at).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(timelineCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Analytics Dashboard</h1>
        
        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Property Type</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                value={filters.propertyType}
                onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
              >
                {availableFilters.propertyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              >
                {availableFilters.locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Price Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: Number(e.target.value) })}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date Range</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as Filters['dateRange'] })}
              >
                <option value="all">All Time</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-700">Total Listings</h3>
            <p className="text-3xl font-bold text-blue-600">
              {data.propertyTypes.reduce((sum, type) => sum + type.value, 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-700">Average Price</h3>
            <p className="text-3xl font-bold text-green-600">
              {data.priceVsSurface.length > 0
                ? `${Math.round(
                    data.priceVsSurface.reduce((sum, item) => sum + item.price, 0) /
                      data.priceVsSurface.length
                  )} DT`
                : 'N/A'}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-700">Average Surface</h3>
            <p className="text-3xl font-bold text-purple-600">
              {data.priceVsSurface.length > 0
                ? `${Math.round(
                    data.priceVsSurface.reduce((sum, item) => sum + item.surface, 0) /
                      data.priceVsSurface.length
                  )} m²`
                : 'N/A'}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-700">Locations</h3>
            <p className="text-3xl font-bold text-orange-600">
              {data.locationDistribution.length}
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Property Types Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Property Types Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.propertyTypes}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {data.propertyTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Price Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Price Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.priceRanges}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Price vs Surface Scatter Plot */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Price vs Surface Area</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="surface" name="Surface (m²)" unit="m²" />
              <YAxis dataKey="price" name="Price" unit=" DT" />
              <ZAxis range={[100]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name="Properties" data={data.priceVsSurface} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Average Price by Property Type */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Average Price by Property Type</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.averagePriceByType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgPrice" fill="#82ca9d" name="Average Price (DT)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Surface Area Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Surface Area Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.surfaceRanges}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="count" fill="#82ca9d" stroke="#82ca9d" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Scraping Timeline */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Scraping Timeline</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.scrapingTimeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}