#!/usr/bin/env tsx
import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(process.cwd(), '.env.local') });

import { COLLECTIONS } from '../lib/firebase-collections';
import { adminDb } from '../lib/firebase-admin';

async function checkFirestore() {
  const snapshot = await adminDb.collection(COLLECTIONS.MODEL_LIBRARY).limit(5).get();

  console.log(`Total docs: ${snapshot.size}`);
  console.log('\nFirst 5 documents:\n');

  snapshot.docs.forEach((doc, i) => {
    const data = doc.data();
    console.log(`Doc ${i + 1}:`);
    console.log('  ID:', doc.id);
    console.log('  Manufacturer:', data.manufacturer);
    console.log('  Model:', data.model);
    console.log('  Storage:', data.storageVariant);
    console.log('  Platform:', data.platform);
    console.log('  DeviceID in specs:', data.specifications?.deviceId);
    console.log('  Specs keys:', Object.keys(data.specifications || {}));
    console.log('');
  });
}

checkFirestore()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
