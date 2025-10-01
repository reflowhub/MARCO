#!/usr/bin/env tsx
/**
 * Seed Firestore with Model Library data from Excel file
 * Usage: npx tsx scripts/seed-model-library.ts
 */

// Load environment variables BEFORE any other imports
import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(process.cwd(), '.env.local') });

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { COLLECTIONS } from '../lib/firebase-collections';
import { ModelLibraryDevice } from '../lib/types';

// Import Firebase Admin after env is loaded
import { adminDb } from '../lib/firebase-admin';

async function seedModelLibrary() {
  const filePath = join(process.cwd(), 'Business Logic Files', 'Model Library Variant v1.1.xlsx');

  console.log('Reading file:', filePath);

  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet);

  console.log(`Found ${data.length} rows in Excel file`);
  console.log('Sample row:', data[0]);

  const devices: Partial<ModelLibraryDevice>[] = [];
  const errors: string[] = [];

  data.forEach((row: any, index: number) => {
    try {
      // Get manufacturer from 'Make' column
      const manufacturer = row['Make'] || row['Manufacturer'] || row['manufacturer'];

      // Get model from 'Model-Memory (clean)' or 'Model' column
      const modelFull = row['Model-Memory (clean)'] || row['Model'] || row['model'];

      // Extract storage variant from the model string (e.g., "iPhone 5 64GB" -> "64GB")
      const storageMatch = modelFull?.match(/(\d+(?:\.\d+)?(?:GB|TB|MB))/i);
      const storageVariant = storageMatch ? storageMatch[0] : '';

      // Extract base model name (remove storage from full model name)
      const model = modelFull?.replace(/\s+\d+(?:\.\d+)?(?:GB|TB|MB)\s*/i, '').trim();

      // Determine platform
      let platform: 'Android' | 'Apple' = 'Android';
      if (manufacturer?.toLowerCase().includes('apple') || model?.toLowerCase().includes('iphone') || model?.toLowerCase().includes('ipad')) {
        platform = 'Apple';
      }

      const specifications: Record<string, any> = {};

      // Add deviceId if it exists
      if (row['DeviceID']) {
        specifications.deviceId = row['DeviceID'];
      }

      // Add full model name if it exists
      if (modelFull) {
        specifications.fullModelName = modelFull;
      }

      // Extract other columns as specifications
      Object.keys(row).forEach((key) => {
        const skipKeys = ['Make', 'Manufacturer', 'manufacturer', 'Model', 'model', 'Model-Memory (clean)', 'Model-Memory (formula)', 'DeviceID', 'Storage Variant', 'storage_variant', 'Storage', 'Platform', 'platform'];
        if (!skipKeys.includes(key) && row[key] !== null && row[key] !== undefined && row[key] !== '') {
          specifications[key] = row[key];
        }
      });

      const device: Partial<ModelLibraryDevice> = {
        manufacturer,
        model,
        storageVariant: storageVariant || '',
        platform,
        sortOrder: index, // Initialize with row index, can be manually reordered later
        specifications,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Validate required fields
      if (!device.manufacturer || !device.model) {
        errors.push(`Row ${index + 2}: Missing manufacturer or model (${manufacturer} / ${model})`);
      } else {
        devices.push(device);
      }
    } catch (error: any) {
      errors.push(`Row ${index + 2}: ${error.message}`);
    }
  });

  console.log(`\nParsed ${devices.length} valid devices`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`);
    errors.slice(0, 10).forEach(err => console.log('  -', err));
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more errors`);
    }
  }

  // Clear existing data
  console.log('\nClearing existing model library data...');
  const existingDocs = await adminDb.collection(COLLECTIONS.MODEL_LIBRARY).get();
  const deletePromises = existingDocs.docs.map(doc => doc.ref.delete());
  await Promise.all(deletePromises);
  console.log(`Deleted ${existingDocs.size} existing documents`);

  // Batch write to Firestore (max 500 per batch)
  console.log('\nWriting to Firestore...');
  const batchSize = 500;
  let processed = 0;

  for (let i = 0; i < devices.length; i += batchSize) {
    const batch = adminDb.batch();
    const chunk = devices.slice(i, i + batchSize);

    chunk.forEach((device) => {
      const docRef = adminDb.collection(COLLECTIONS.MODEL_LIBRARY).doc();
      batch.set(docRef, {
        ...device,
        id: docRef.id,
      });
    });

    await batch.commit();
    processed += chunk.length;
    console.log(`Progress: ${processed}/${devices.length} (${Math.round(processed / devices.length * 100)}%)`);
  }

  // Log upload history
  const uploadHistoryRef = adminDb.collection(COLLECTIONS.UPLOAD_HISTORY).doc();
  await uploadHistoryRef.set({
    id: uploadHistoryRef.id,
    fileName: 'Model Library Variant v1.1.xlsx',
    fileType: 'model-library',
    uploadDate: new Date(),
    uploadedBy: 'seed-script',
    recordsProcessed: devices.length,
    status: 'completed',
    createdAt: new Date(),
  });

  console.log('\n✅ Model library seeded successfully!');
  console.log(`Total devices: ${devices.length}`);
}

seedModelLibrary()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
