'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

export default function TestFirebase() {
  const [status, setStatus] = useState<string>('Checking connection...');
  const [testData, setTestData] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      testConnection();
    }
  }, [isClient]);

  const testConnection = async () => {
    try {
      // Dynamically import Firebase only on client side
      const { db } = await import('@/lib/firebase');
      const { collection, getDocs } = await import('firebase/firestore');

      // Test Firestore connection
      setStatus('Testing Firestore connection...');

      // Try to read from a test collection
      const testCollection = collection(db, 'test');
      const snapshot = await getDocs(testCollection);

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setTestData(data);
      setStatus('✅ Firebase connected successfully!');
    } catch (error: any) {
      setStatus(`❌ Connection error: ${error.message}`);
      console.error('Firebase connection error:', error);
    }
  };

  const addTestDocument = async () => {
    try {
      const { db } = await import('@/lib/firebase');
      const { collection, addDoc } = await import('firebase/firestore');

      setStatus('Adding test document...');
      const docRef = await addDoc(collection(db, 'test'), {
        message: 'Hello from MARCO!',
        timestamp: new Date().toISOString(),
        random: Math.floor(Math.random() * 1000)
      });

      setStatus(`✅ Document added with ID: ${docRef.id}`);
      testConnection(); // Refresh the data
    } catch (error: any) {
      setStatus(`❌ Error adding document: ${error.message}`);
      console.error('Error adding document:', error);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Firebase Connection Test</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">Connection Status</h2>
          <p className={`text-lg ${status.includes('✅') ? 'text-green-600' : status.includes('❌') ? 'text-red-600' : 'text-yellow-600'}`}>
            {status}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">Actions</h2>
          <button
            onClick={addTestDocument}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-3"
          >
            Add Test Document
          </button>
          <button
            onClick={testConnection}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Refresh Connection
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-3">Test Collection Data</h2>
          {testData.length > 0 ? (
            <div className="space-y-2">
              {testData.map((doc) => (
                <div key={doc.id} className="border p-3 rounded">
                  <p className="text-sm text-gray-600">ID: {doc.id}</p>
                  <pre className="text-sm mt-1">{JSON.stringify(doc, null, 2)}</pre>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No documents in test collection yet.</p>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Make sure you have enabled Firestore in your Firebase Console and set appropriate security rules.
          </p>
        </div>
      </div>
    </div>
  );
}