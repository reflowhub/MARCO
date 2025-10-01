#!/usr/bin/env tsx
/**
 * Add sortOrder field to existing Model Library devices in Firestore
 * Usage: npx tsx --env-file=.env.local scripts/add-sort-order.ts
 */

import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(process.cwd(), '.env.local') });

import { COLLECTIONS } from '../lib/firebase-collections';
import { adminDb } from '../lib/firebase-admin';

async function addSortOrder() {
  console.log('Fetching all devices...');
  const snapshot = await adminDb.collection(COLLECTIONS.MODEL_LIBRARY).get();

  console.log(`Found ${snapshot.size} devices`);

  // Sort devices by deviceId to maintain consistent ordering
  const docs = snapshot.docs.sort((a, b) => {
    const deviceIdA = a.data().specifications?.deviceId || 0;
    const deviceIdB = b.data().specifications?.deviceId || 0;
    return deviceIdA - deviceIdB;
  });

  console.log('Updating sortOrder field...');

  // Batch update (max 500 per batch)
  const batchSize = 500;
  let processed = 0;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = adminDb.batch();
    const chunk = docs.slice(i, i + batchSize);

    chunk.forEach((doc, localIndex) => {
      const sortOrder = i + localIndex;
      batch.update(doc.ref, {
        sortOrder,
        updatedAt: new Date(),
      });
    });

    await batch.commit();
    processed += chunk.length;
    console.log(`Progress: ${processed}/${docs.length} (${Math.round(processed / docs.length * 100)}%)`);
  }

  console.log('\n✅ sortOrder field added successfully!');
  console.log(`Total devices updated: ${docs.length}`);
}

addSortOrder()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to add sortOrder:', error);
    process.exit(1);
  });
