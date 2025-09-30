'use client';

import { useEffect, useState } from 'react';
import { db, app } from '@/lib/firebase';

export default function FirebaseStatus() {
  const [status, setStatus] = useState<{
    configured: boolean;
    projectId: string | null;
    error: string | null;
  }>({
    configured: false,
    projectId: null,
    error: null,
  });

  useEffect(() => {
    try {
      // Check if Firebase is properly configured
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

      if (!projectId || !apiKey || projectId === '' || apiKey === '') {
        setStatus({
          configured: false,
          projectId: null,
          error: 'Firebase environment variables not configured',
        });
        return;
      }

      // Check if db is initialized
      if (!db || typeof db !== 'object' || Object.keys(db).length === 0) {
        setStatus({
          configured: false,
          projectId,
          error: 'Firestore not initialized (empty object)',
        });
        return;
      }

      setStatus({
        configured: true,
        projectId,
        error: null,
      });
    } catch (error: any) {
      setStatus({
        configured: false,
        projectId: null,
        error: error.message,
      });
    }
  }, []);

  if (status.configured) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm">
        ✅ Firebase connected to project: <strong>{status.projectId}</strong>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
      <div className="font-semibold mb-2">⚠️ Firebase Configuration Issue</div>
      <div className="text-sm mb-2">{status.error}</div>
      <div className="text-xs">
        Please ensure your Firebase environment variables are set in:
        <ul className="list-disc list-inside mt-1 ml-2">
          <li>
            <strong>Local development:</strong> <code>.env.local</code> file
          </li>
          <li>
            <strong>Vercel deployment:</strong> Project Settings → Environment Variables
          </li>
        </ul>
        <div className="mt-2">
          Required variables:
          <code className="block mt-1 bg-yellow-100 p-2 rounded">
            NEXT_PUBLIC_FIREBASE_API_KEY
            <br />
            NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
            <br />
            NEXT_PUBLIC_FIREBASE_PROJECT_ID
            <br />
            NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
            <br />
            NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
            <br />
            NEXT_PUBLIC_FIREBASE_APP_ID
          </code>
        </div>
      </div>
    </div>
  );
}
