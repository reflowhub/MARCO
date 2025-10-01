'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firebase-collections';
import { TradeIn, Supplier } from '@/lib/types';

interface ModelGradeTrend {
  modelGrade: string; // "iPhone 12 Pro 64GB - C"
  deviceModel: string;
  grade: string;
  platform: 'Android' | 'Apple';
  batches: {
    batchFileName: string;
    dateBooked: Date;
    cost: number;
    currency: string;
    quantity: number;
    supplierId: string;
  }[];
  totalVolume: number;
  soldVolume: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  currentPrice: number; // Most recent batch
  priceVariance: number;
  priceChange: number; // Change from first to last batch
  priceChangePercent: number;
  averageSoldPrice: number;
  averageMargin: number;
  averageMarginPercent: number;
}

export default function TrendsPage() {
  const [tradeIns, setTradeIns] = useState<TradeIn[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, Supplier>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [platformFilter, setPlatformFilter] = useState<'all' | 'Android' | 'Apple'>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minVolume, setMinVolume] = useState<number>(1);
  const [sortBy, setSortBy] = useState<'volume' | 'variance' | 'priceChange' | 'model'>('volume');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load suppliers
      const suppliersSnapshot = await getDocs(collection(db, COLLECTIONS.SUPPLIERS));
      const suppliersMap: Record<string, Supplier> = {};
      suppliersSnapshot.forEach((doc) => {
        suppliersMap[doc.id] = { id: doc.id, ...doc.data() } as Supplier;
      });
      setSuppliers(suppliersMap);

      // Load trade-ins
      const tradeInsSnapshot = await getDocs(
        query(collection(db, COLLECTIONS.TRADE_INS), orderBy('dateBooked', 'desc'))
      );
      const data = tradeInsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dateBooked: doc.data().dateBooked?.toDate(),
        purchaseDate: doc.data().purchaseDate?.toDate(),
        auctionDate: doc.data().auctionDate?.toDate(),
        soldDate: doc.data().soldDate?.toDate(),
      })) as TradeIn[];
      setTradeIns(data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate trends
  const trends = useMemo(() => {
    const trendMap = new Map<string, ModelGradeTrend>();

    tradeIns.forEach((tradeIn) => {
      const key = `${tradeIn.deviceModel}|||${tradeIn.grade}`;

      if (!trendMap.has(key)) {
        trendMap.set(key, {
          modelGrade: `${tradeIn.deviceModel} - ${tradeIn.grade}`,
          deviceModel: tradeIn.deviceModel,
          grade: tradeIn.grade,
          platform: tradeIn.platform,
          batches: [],
          totalVolume: 0,
          soldVolume: 0,
          averagePrice: 0,
          minPrice: Infinity,
          maxPrice: -Infinity,
          currentPrice: 0,
          priceVariance: 0,
          priceChange: 0,
          priceChangePercent: 0,
          averageSoldPrice: 0,
          averageMargin: 0,
          averageMarginPercent: 0,
        });
      }

      const trend = trendMap.get(key)!;

      // Find or create batch entry
      const batchIndex = trend.batches.findIndex(
        (b) => b.batchFileName === tradeIn.batchFileName
      );

      if (batchIndex === -1) {
        trend.batches.push({
          batchFileName: tradeIn.batchFileName || 'Unknown',
          dateBooked: tradeIn.dateBooked,
          cost: tradeIn.cost,
          currency: tradeIn.currency,
          quantity: 1,
          supplierId: tradeIn.supplierId,
        });
      } else {
        trend.batches[batchIndex].quantity += 1;
      }

      trend.totalVolume += 1;
    });

    // Calculate statistics for each trend
    trendMap.forEach((trend) => {
      // Sort batches by date
      trend.batches.sort((a, b) => a.dateBooked.getTime() - b.dateBooked.getTime());

      const prices = trend.batches.map((b) => b.cost);
      trend.averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      trend.minPrice = Math.min(...prices);
      trend.maxPrice = Math.max(...prices);
      trend.currentPrice = prices[prices.length - 1];

      // Calculate variance
      const squaredDiffs = prices.map((p) => Math.pow(p - trend.averagePrice, 2));
      trend.priceVariance = Math.sqrt(
        squaredDiffs.reduce((sum, d) => sum + d, 0) / prices.length
      );

      // Calculate price change
      const firstPrice = prices[0];
      const lastPrice = prices[prices.length - 1];
      trend.priceChange = lastPrice - firstPrice;
      trend.priceChangePercent = ((lastPrice - firstPrice) / firstPrice) * 100;

      // Calculate margin statistics from sold items
      const soldItems = tradeIns.filter(
        (t) =>
          t.deviceModel === trend.deviceModel &&
          t.grade === trend.grade &&
          t.soldPrice &&
          t.soldCurrency === t.currency // Only calculate margin if same currency
      );

      trend.soldVolume = soldItems.length;

      if (soldItems.length > 0) {
        const totalSoldPrice = soldItems.reduce((sum, t) => sum + (t.soldPrice || 0), 0);
        trend.averageSoldPrice = totalSoldPrice / soldItems.length;

        const totalMargin = soldItems.reduce((sum, t) => sum + ((t.soldPrice || 0) - t.cost), 0);
        trend.averageMargin = totalMargin / soldItems.length;

        const totalMarginPercent = soldItems.reduce(
          (sum, t) => sum + (((t.soldPrice || 0) - t.cost) / t.cost) * 100,
          0
        );
        trend.averageMarginPercent = totalMarginPercent / soldItems.length;
      }
    });

    return Array.from(trendMap.values());
  }, [tradeIns]);

  // Filter trends
  const filteredTrends = useMemo(() => {
    return trends.filter((trend) => {
      if (platformFilter !== 'all' && trend.platform !== platformFilter) return false;
      if (gradeFilter !== 'all' && trend.grade !== gradeFilter) return false;
      if (trend.totalVolume < minVolume) return false;
      if (searchQuery && !trend.deviceModel.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;

      if (supplierFilter !== 'all') {
        const hasSupplier = trend.batches.some((b) => b.supplierId === supplierFilter);
        if (!hasSupplier) return false;
      }

      return true;
    });
  }, [trends, platformFilter, gradeFilter, minVolume, searchQuery, supplierFilter]);

  // Sort trends
  const sortedTrends = useMemo(() => {
    const sorted = [...filteredTrends];
    sorted.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'volume':
          aVal = a.totalVolume;
          bVal = b.totalVolume;
          break;
        case 'variance':
          aVal = a.priceVariance;
          bVal = b.priceVariance;
          break;
        case 'priceChange':
          aVal = a.priceChangePercent;
          bVal = b.priceChangePercent;
          break;
        case 'model':
          return sortDirection === 'asc'
            ? a.deviceModel.localeCompare(b.deviceModel)
            : b.deviceModel.localeCompare(a.deviceModel);
        default:
          aVal = a.totalVolume;
          bVal = b.totalVolume;
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [filteredTrends, sortBy, sortDirection]);

  // Get unique grades for filter
  const uniqueGrades = useMemo(() => {
    return Array.from(new Set(tradeIns.map((t) => t.grade))).sort();
  }, [tradeIns]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto p-6">Loading trends...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Price & Volume Trends</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Model/Grade Combinations</div>
          <div className="text-2xl font-bold">{filteredTrends.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Volume</div>
          <div className="text-2xl font-bold">
            {filteredTrends.reduce((sum, t) => sum + t.totalVolume, 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Avg Batches per Model</div>
          <div className="text-2xl font-bold">
            {filteredTrends.length > 0
              ? (
                  filteredTrends.reduce((sum, t) => sum + t.batches.length, 0) /
                  filteredTrends.length
                ).toFixed(1)
              : 0}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Unique Batches</div>
          <div className="text-2xl font-bold">
            {new Set(tradeIns.map((t) => t.batchFileName).filter(Boolean)).size}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as any)}
              className="w-full border border-gray-300 rounded-md p-2"
            >
              <option value="all">All</option>
              <option value="Android">Android</option>
              <option value="Apple">Apple</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
            >
              <option value="all">All</option>
              {uniqueGrades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
            >
              <option value="all">All</option>
              {Object.values(suppliers).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Volume</label>
            <input
              type="number"
              min="1"
              value={minVolume}
              onChange={(e) => setMinVolume(parseInt(e.target.value) || 1)}
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Model</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by model name..."
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>
        </div>
      </div>

      {/* Trends Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('model')}
                >
                  Model / Grade {sortBy === 'model' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Platform
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('volume')}
                >
                  Volume {sortBy === 'volume' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Avg Cost
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Avg Sold
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Avg Margin
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('priceChange')}
                >
                  Cost Δ {sortBy === 'priceChange' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('variance')}
                >
                  Volatility {sortBy === 'variance' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTrends.map((trend) => (
                <tr key={trend.modelGrade} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {trend.deviceModel}
                    <div className="text-xs text-gray-500">Grade {trend.grade}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        trend.platform === 'Apple'
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-green-200 text-green-800'
                      }`}
                    >
                      {trend.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                    {trend.totalVolume}
                    {trend.soldVolume > 0 && (
                      <div className="text-xs text-green-600">{trend.soldVolume} sold</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    ${trend.averagePrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {trend.soldVolume > 0 ? (
                      <>${trend.averageSoldPrice.toFixed(2)}</>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">
                    {trend.soldVolume > 0 ? (
                      <>
                        <span className={trend.averageMargin > 0 ? 'text-green-600' : 'text-red-600'}>
                          ${trend.averageMargin.toFixed(2)}
                        </span>
                        <div className="text-xs text-gray-500">
                          {trend.averageMarginPercent.toFixed(1)}%
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`font-semibold ${
                        trend.priceChangePercent > 0
                          ? 'text-red-600'
                          : trend.priceChangePercent < 0
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {trend.priceChangePercent > 0 ? '+' : ''}
                      {trend.priceChangePercent.toFixed(1)}%
                    </span>
                    <div className="text-xs text-gray-500">
                      ${Math.abs(trend.priceChange).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    ${trend.priceVariance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedTrends.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No trends found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
}
