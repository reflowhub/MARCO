#!/usr/bin/env tsx
/**
 * Seed initial suppliers into Firestore
 * Usage: npx tsx --env-file=.env.local scripts/seed-suppliers.ts
 */

import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(process.cwd(), '.env.local') });

import { COLLECTIONS } from '../lib/firebase-collections';
import { adminDb } from '../lib/firebase-admin';

const suppliers = [
  {
    name: 'ETL',
    country: 'New Zealand',
    currency: 'NZD',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  },
];

async function seedSuppliers() {
  console.log('Seeding suppliers...');

  for (const supplier of suppliers) {
    // Check if supplier already exists
    const existing = await adminDb
      .collection(COLLECTIONS.SUPPLIERS)
      .where('name', '==', supplier.name)
      .get();

    if (!existing.empty) {
      console.log(`Supplier "${supplier.name}" already exists, skipping...`);
      continue;
    }

    // Add supplier
    await adminDb.collection(COLLECTIONS.SUPPLIERS).add({
      ...supplier,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✓ Added supplier: ${supplier.name}`);
  }

  console.log('\n✅ Suppliers seeded successfully!');
}

seedSuppliers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
