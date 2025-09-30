'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firebase-collections';
import { CustomerBid, Customer } from '@/lib/types';

export default function BidsPage() {
  const [bids, setBids] = useState<CustomerBid[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'Android' | 'Apple'>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load customers
      const customersSnapshot = await getDocs(collection(db, COLLECTIONS.CUSTOMERS));
      const customersMap: Record<string, Customer> = {};
      customersSnapshot.forEach((doc) => {
        customersMap[doc.id] = { id: doc.id, ...doc.data() } as Customer;
      });
      setCustomers(customersMap);

      // Load bids
      const bidsSnapshot = await getDocs(collection(db, COLLECTIONS.CUSTOMER_BIDS));
      const data = bidsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        auctionDate: doc.data().auctionDate?.toDate(),
      })) as CustomerBid[];
      setBids(data);
    } catch (error) {
      console.error('Error loading bids:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBids = bids.filter((bid) => {
    if (platformFilter !== 'all' && bid.platform !== platformFilter) return false;
    if (customerFilter !== 'all' && bid.customerId !== customerFilter) return false;
    return true;
  });

  const groupedByAuction = filteredBids.reduce((acc, bid) => {
    const date = bid.auctionDate ? bid.auctionDate.toLocaleDateString() : 'Unknown';
    if (!acc[date]) acc[date] = [];
    acc[date].push(bid);
    return acc;
  }, {} as Record<string, CustomerBid[]>);

  if (loading) {
    return <div className="max-w-7xl mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Customer Bids</h1>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Bids</div>
          <div className="text-2xl font-bold">{bids.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold">
            {bids.filter((b) => b.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Accepted</div>
          <div className="text-2xl font-bold">
            {bids.filter((b) => b.status === 'accepted').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Active Customers</div>
          <div className="text-2xl font-bold">
            {new Set(bids.map((b) => b.customerId)).size}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
            >
              <option value="all">All</option>
              {Object.values(customers).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bids by Auction Date */}
      <div className="space-y-6">
        {Object.entries(groupedByAuction).map(([date, auctionBids]) => (
          <div key={date} className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Auction Date: {date}</h3>
              <div className="text-sm text-gray-600">
                {auctionBids.length} bids from {new Set(auctionBids.map((b) => b.customerId)).size}{' '}
                customers
              </div>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Model
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Storage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Grade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Platform
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Bid Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auctionBids.map((bid) => (
                  <tr key={bid.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {customers[bid.customerId]?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{bid.deviceModel}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {bid.storageVariant || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{bid.grade}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          bid.platform === 'Apple'
                            ? 'bg-gray-200 text-gray-800'
                            : 'bg-green-200 text-green-800'
                        }`}
                      >
                        {bid.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {bid.currency} ${bid.bidAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          bid.status === 'accepted'
                            ? 'bg-green-200 text-green-800'
                            : bid.status === 'rejected'
                            ? 'bg-red-200 text-red-800'
                            : 'bg-yellow-200 text-yellow-800'
                        }`}
                      >
                        {bid.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {Object.keys(groupedByAuction).length === 0 && (
          <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
            No bids found. Upload customer bid files to get started.
          </div>
        )}
      </div>
    </div>
  );
}
