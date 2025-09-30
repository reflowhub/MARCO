'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firebase-collections';
import { TradeIn, CustomerBid } from '@/lib/types';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalDevices: 0,
    totalCostNZD: 0,
    pendingDevices: 0,
    auctionDevices: 0,
    soldDevices: 0,
    androidDevices: 0,
    appleDevices: 0,
    totalBids: 0,
    averageLeadTimeBookedToAuction: 0,
    averageLeadTimeAuctionToSold: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load trade-ins
      const tradeInsSnapshot = await getDocs(collection(db, COLLECTIONS.TRADE_INS));
      const tradeIns = tradeInsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dateBooked: doc.data().dateBooked?.toDate(),
        auctionDate: doc.data().auctionDate?.toDate(),
        soldDate: doc.data().soldDate?.toDate(),
      })) as TradeIn[];

      // Load bids
      const bidsSnapshot = await getDocs(collection(db, COLLECTIONS.CUSTOMER_BIDS));
      const bids = bidsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as CustomerBid[];

      // Calculate stats
      const totalCostNZD = tradeIns.reduce((sum, t) => sum + (t.costNZD || 0), 0);
      const pendingDevices = tradeIns.filter((t) => t.status === 'pending').length;
      const auctionDevices = tradeIns.filter((t) => t.status === 'auction').length;
      const soldDevices = tradeIns.filter((t) => t.status === 'sold').length;
      const androidDevices = tradeIns.filter((t) => t.platform === 'Android').length;
      const appleDevices = tradeIns.filter((t) => t.platform === 'Apple').length;

      // Calculate lead times
      const bookedToAuction = tradeIns
        .filter((t) => t.dateBooked && t.auctionDate)
        .map((t) => {
          const days = Math.floor(
            (new Date(t.auctionDate!).getTime() - new Date(t.dateBooked).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return days;
        });

      const auctionToSold = tradeIns
        .filter((t) => t.auctionDate && t.soldDate)
        .map((t) => {
          const days = Math.floor(
            (new Date(t.soldDate!).getTime() - new Date(t.auctionDate!).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return days;
        });

      const avgBookedToAuction =
        bookedToAuction.length > 0
          ? Math.round(bookedToAuction.reduce((a, b) => a + b, 0) / bookedToAuction.length)
          : 0;

      const avgAuctionToSold =
        auctionToSold.length > 0
          ? Math.round(auctionToSold.reduce((a, b) => a + b, 0) / auctionToSold.length)
          : 0;

      setStats({
        totalDevices: tradeIns.length,
        totalCostNZD,
        pendingDevices,
        auctionDevices,
        soldDevices,
        androidDevices,
        appleDevices,
        totalBids: bids.length,
        averageLeadTimeBookedToAuction: avgBookedToAuction,
        averageLeadTimeAuctionToSold: avgAuctionToSold,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto p-6">Loading dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Total Devices</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalDevices}</div>
          <div className="text-xs text-gray-500 mt-2">
            {stats.androidDevices} Android, {stats.appleDevices} Apple
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Total Inventory Value</div>
          <div className="text-3xl font-bold text-gray-900">
            ${stats.totalCostNZD.toLocaleString('en-NZ', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-gray-500 mt-2">NZD</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Customer Bids</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalBids}</div>
          <div className="text-xs text-gray-500 mt-2">Total bid submissions</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Avg Lead Time</div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.averageLeadTimeBookedToAuction + stats.averageLeadTimeAuctionToSold}
          </div>
          <div className="text-xs text-gray-500 mt-2">days (total)</div>
        </div>
      </div>

      {/* Device Status Breakdown */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-yellow-50 p-6 rounded-lg shadow border border-yellow-200">
          <div className="text-sm text-yellow-700 mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-900">{stats.pendingDevices}</div>
          <Link href="/admin/trade-ins?status=pending" className="text-xs text-yellow-600 hover:underline mt-2 inline-block">
            View pending devices →
          </Link>
        </div>

        <div className="bg-blue-50 p-6 rounded-lg shadow border border-blue-200">
          <div className="text-sm text-blue-700 mb-1">In Auction</div>
          <div className="text-2xl font-bold text-blue-900">{stats.auctionDevices}</div>
          <Link href="/admin/trade-ins?status=auction" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
            View auction devices →
          </Link>
        </div>

        <div className="bg-green-50 p-6 rounded-lg shadow border border-green-200">
          <div className="text-sm text-green-700 mb-1">Sold</div>
          <div className="text-2xl font-bold text-green-900">{stats.soldDevices}</div>
          <Link href="/admin/trade-ins?status=sold" className="text-xs text-green-600 hover:underline mt-2 inline-block">
            View sold devices →
          </Link>
        </div>
      </div>

      {/* Lead Time Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Lead Time Analysis</h2>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-600">Booked → Auction</div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.averageLeadTimeBookedToAuction} days
            </div>
            <div className="text-xs text-gray-500 mt-1">Average time to tender</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Auction → Sold</div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.averageLeadTimeAuctionToSold} days
            </div>
            <div className="text-xs text-gray-500 mt-1">Average time to award</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Total Journey</div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.averageLeadTimeBookedToAuction + stats.averageLeadTimeAuctionToSold} days
            </div>
            <div className="text-xs text-gray-500 mt-1">Booked to sold</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-4">
          <Link
            href="/admin/upload"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <div className="text-2xl mb-2">📤</div>
            <div className="text-sm font-medium">Upload Files</div>
          </Link>
          <Link
            href="/admin/suppliers"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <div className="text-2xl mb-2">🏢</div>
            <div className="text-sm font-medium">Manage Suppliers</div>
          </Link>
          <Link
            href="/admin/customers"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="text-sm font-medium">Manage Customers</div>
          </Link>
          <Link
            href="/admin/trade-ins"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <div className="text-2xl mb-2">📱</div>
            <div className="text-sm font-medium">View Trade-Ins</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
