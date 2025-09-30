'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firebase-collections';
import { ModelLibraryDevice } from '@/lib/types';

export default function ModelLibraryPage() {
  const [devices, setDevices] = useState<ModelLibraryDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'Android' | 'Apple'>('all');

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.MODEL_LIBRARY));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ModelLibraryDevice[];
      setDevices(data);
    } catch (error) {
      console.error('Error loading model library:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDevices = devices.filter((device) => {
    if (platformFilter !== 'all' && device.platform !== platformFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        device.manufacturer?.toLowerCase().includes(search) ||
        device.model?.toLowerCase().includes(search) ||
        device.storageVariant?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (loading) {
    return <div className="max-w-7xl mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Model Library</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Models</div>
          <div className="text-2xl font-bold">{devices.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Android Models</div>
          <div className="text-2xl font-bold">
            {devices.filter((d) => d.platform === 'Android').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Apple Models</div>
          <div className="text-2xl font-bold">
            {devices.filter((d) => d.platform === 'Apple').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by manufacturer, model, or storage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>
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
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Manufacturer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Storage Variant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Platform
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDevices.map((device) => (
              <tr key={device.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {device.manufacturer}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{device.model}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {device.storageVariant || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      device.platform === 'Apple'
                        ? 'bg-gray-200 text-gray-800'
                        : 'bg-green-200 text-green-800'
                    }`}
                  >
                    {device.platform}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDevices.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {devices.length === 0
              ? 'No devices in library. Upload a Model Library file to get started.'
              : 'No devices match your search criteria.'}
          </div>
        )}
      </div>
    </div>
  );
}
