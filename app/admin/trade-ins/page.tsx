'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firebase-collections';
import { TradeIn, Supplier } from '@/lib/types';

export default function TradeInsPage() {
  const [tradeIns, setTradeIns] = useState<TradeIn[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, Supplier>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [platformFilter, setPlatformFilter] = useState<'all' | 'Android' | 'Apple'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'auction' | 'sold'>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load suppliers first
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
        auctionDate: doc.data().auctionDate?.toDate(),
        soldDate: doc.data().soldDate?.toDate(),
      })) as TradeIn[];
      setTradeIns(data);
    } catch (error) {
      console.error('Error loading trade-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTradeIns = tradeIns.filter((tradeIn) => {
    if (platformFilter !== 'all' && tradeIn.platform !== platformFilter) return false;
    if (statusFilter !== 'all' && tradeIn.status !== statusFilter) return false;
    if (supplierFilter !== 'all' && tradeIn.supplierId !== supplierFilter) return false;

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (tradeIn.dateBooked < fromDate) return false;
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (tradeIn.dateBooked > toDate) return false;
    }

    return true;
  });

  const totalCost = filteredTradeIns.reduce((sum, t) => sum + t.cost, 0);
  const averageLeadTime = calculateAverageLeadTime(filteredTradeIns);

  if (loading) {
    return <div className="max-w-7xl mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Trade-Ins</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Devices</div>
          <div className="text-2xl font-bold">{filteredTradeIns.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Cost (NZD)</div>
          <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Avg. Lead Time</div>
          <div className="text-2xl font-bold">{averageLeadTime} days</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold">
            {filteredTradeIns.filter((t) => t.status === 'pending').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-5 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full border border-gray-300 rounded-md p-2"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="auction">Auction</option>
              <option value="sold">Sold</option>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>
        </div>
      </div>

      {/* Trade-Ins Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Booked</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Storage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost (NZD)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auction Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTradeIns.map((tradeIn) => (
                <tr key={tradeIn.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {tradeIn.dateBooked ? new Date(tradeIn.dateBooked).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{tradeIn.deviceModel}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{tradeIn.storageVariant || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{tradeIn.grade}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        tradeIn.platform === 'Apple'
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-green-200 text-green-800'
                      }`}
                    >
                      {tradeIn.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    ${tradeIn.cost.toFixed(2)} {tradeIn.currency}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {suppliers[tradeIn.supplierId]?.name || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        tradeIn.status === 'sold'
                          ? 'bg-green-200 text-green-800'
                          : tradeIn.status === 'auction'
                          ? 'bg-blue-200 text-blue-800'
                          : 'bg-yellow-200 text-yellow-800'
                      }`}
                    >
                      {tradeIn.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {tradeIn.auctionDate ? new Date(tradeIn.auctionDate).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTradeIns.length === 0 && (
          <div className="text-center py-8 text-gray-500">No trade-ins found matching your filters.</div>
        )}
      </div>
    </div>
  );
}

function calculateAverageLeadTime(tradeIns: TradeIn[]): number {
  const withLeadTime = tradeIns.filter((t) => t.dateBooked && t.auctionDate);
  if (withLeadTime.length === 0) return 0;

  const totalDays = withLeadTime.reduce((sum, t) => {
    const days = Math.floor(
      (new Date(t.auctionDate!).getTime() - new Date(t.dateBooked).getTime()) / (1000 * 60 * 60 * 24)
    );
    return sum + days;
  }, 0);

  return Math.round(totalDays / withLeadTime.length);
}
