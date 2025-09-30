/**
 * Initialize Firestore collections
 * Run this script once to set up the database structure
 *
 * Usage: npx tsx scripts/init-firestore.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTIONS = {
  SUPPLIERS: 'suppliers',
  CUSTOMERS: 'customers',
  MODEL_LIBRARY: 'modelLibrary',
  TRADE_INS: 'tradeIns',
  CUSTOMER_BIDS: 'customerBids',
  UPLOAD_HISTORY: 'uploadHistory',
  AUCTIONS: 'auctions',
};

async function initializeCollections() {
  console.log('🔧 Initializing Firestore collections...\n');

  for (const [name, collectionName] of Object.entries(COLLECTIONS)) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);

      if (snapshot.empty) {
        console.log(`📝 Collection '${collectionName}' is empty - it will be created on first write`);
      } else {
        console.log(`✅ Collection '${collectionName}' exists with ${snapshot.size} documents`);
      }
    } catch (error: any) {
      console.error(`❌ Error checking collection '${collectionName}':`, error.message);
    }
  }

  console.log('\n✨ Firestore initialization complete!');
  console.log('\nNote: Collections are created automatically when you add the first document.');
  console.log('Try creating a supplier through the UI now.\n');
}

initializeCollections()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to initialize:', error);
    process.exit(1);
  });
