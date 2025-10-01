'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firebase-collections';
import { Supplier, Customer } from '@/lib/types';

type UploadType = 'model-library' | 'trade-ins' | 'customer-bids';

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState<UploadType>('model-library');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(''); // For trade-ins
  const [auctionDate, setAuctionDate] = useState(''); // For customer bids
  const [tradeInCurrency, setTradeInCurrency] = useState<'NZD' | 'USD' | 'AUD'>('NZD'); // For trade-ins
  const [customerBidCurrency, setCustomerBidCurrency] = useState<'USD' | 'AUD'>('USD'); // For customer bids

  // Data from Firestore
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadSuppliersAndCustomers();
  }, []);

  const loadSuppliersAndCustomers = async () => {
    try {
      const [suppliersSnapshot, customersSnapshot] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.SUPPLIERS)),
        getDocs(collection(db, COLLECTIONS.CUSTOMERS)),
      ]);

      setSuppliers(
        suppliersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Supplier[]
      );
      setCustomers(
        customersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Customer[]
      );
    } catch (error) {
      console.error('Error loading suppliers/customers:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      if (activeTab === 'trade-ins') {
        if (!supplierId) {
          setResult({ success: false, message: 'Please select a supplier' });
          setUploading(false);
          return;
        }
        formData.append('supplierId', supplierId);
        formData.append('currency', tradeInCurrency);
        if (purchaseDate) {
          formData.append('purchaseDate', purchaseDate);
        }
      }

      if (activeTab === 'customer-bids') {
        if (!customerId) {
          setResult({ success: false, message: 'Please select a customer' });
          setUploading(false);
          return;
        }
        if (!auctionDate) {
          setResult({ success: false, message: 'Please select an auction date' });
          setUploading(false);
          return;
        }
        formData.append('customerId', customerId);
        formData.append('auctionDate', auctionDate);
        formData.append('currency', customerBidCurrency);
      }

      const response = await fetch(`/api/upload/${activeTab}`, {
        method: 'POST',
        body: formData,
      });

      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Response is not JSON - likely an error page
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 500));
        setResult({
          success: false,
          message: `Server error: Response was not JSON. Status: ${response.status}. Check console for details.`,
        });
        setUploading(false);
        return;
      }

      if (response.ok) {
        setResult({
          success: true,
          message: `Successfully uploaded ${data.recordsProcessed} records`,
        });
        setFile(null);
        // Reset form
        setSupplierId('');
        setCustomerId('');
        setAuctionDate('');
      } else {
        setResult({
          success: false,
          message: data.error || 'Upload failed',
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Upload failed',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Upload Files</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('model-library')}
            className={`${
              activeTab === 'model-library'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Model Library
          </button>
          <button
            onClick={() => setActiveTab('trade-ins')}
            className={`${
              activeTab === 'trade-ins'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Trade-Ins (Standardized)
          </button>
          <button
            onClick={() => setActiveTab('customer-bids')}
            className={`${
              activeTab === 'customer-bids'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Customer Bids
          </button>
        </nav>
      </div>

      {/* Upload Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Excel File
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">Selected: {file.name}</p>
            )}
          </div>

          {/* Trade-Ins Specific Fields */}
          {activeTab === 'trade-ins' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier *
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  disabled={loadingData}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.country})
                    </option>
                  ))}
                </select>
                {suppliers.length === 0 && !loadingData && (
                  <p className="mt-1 text-sm text-red-600">
                    No suppliers found. Please add a supplier first.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Date (Optional)
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Date of bulk purchase from supplier (if different from individual device booking dates in the file)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency *
                </label>
                <select
                  value={tradeInCurrency}
                  onChange={(e) => setTradeInCurrency(e.target.value as 'NZD' | 'USD' | 'AUD')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                >
                  <option value="NZD">NZD</option>
                  <option value="USD">USD</option>
                  <option value="AUD">AUD</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Currency of the costs in the file
                </p>
              </div>
            </>
          )}

          {/* Customer Bids Specific Fields */}
          {activeTab === 'customer-bids' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer *
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  disabled={loadingData}
                >
                  <option value="">Select Customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.country})
                    </option>
                  ))}
                </select>
                {customers.length === 0 && !loadingData && (
                  <p className="mt-1 text-sm text-red-600">
                    No customers found. Please add a customer first.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auction Date *
                </label>
                <input
                  type="date"
                  value={auctionDate}
                  onChange={(e) => setAuctionDate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency *
                </label>
                <select
                  value={customerBidCurrency}
                  onChange={(e) => setCustomerBidCurrency(e.target.value as 'USD' | 'AUD')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                >
                  <option value="USD">USD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
              ${
                !file || uploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>

          {/* Result Message */}
          {result && (
            <div
              className={`p-4 rounded-md ${
                result.success
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {result.message}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 p-4 rounded-md">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Instructions</h3>
        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
          {activeTab === 'model-library' && (
            <>
              <li>Upload the Model Library Variant Excel file</li>
              <li>Expected columns: Manufacturer, Model, Storage Variant, Platform</li>
              <li>This updates the database of supported devices</li>
            </>
          )}
          {activeTab === 'trade-ins' && (
            <>
              <li>Upload standardized trade-in files from suppliers (your purchase records)</li>
              <li>Expected columns: Date Booked, Model, Grade, Cost, Storage, Platform</li>
              <li>Date Booked = Individual device booking/acquisition date</li>
              <li>Select the supplier, currency, and optionally the bulk purchase date</li>
              <li>Currency determines how cost values in the file are interpreted</li>
            </>
          )}
          {activeTab === 'customer-bids' && (
            <>
              <li>Upload customer bid files</li>
              <li>Expected columns: Model, Grade, Bid Amount, Storage, Platform</li>
              <li>Select the customer, auction date, and currency (USD or AUD)</li>
              <li>These are clean files without cost information</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
