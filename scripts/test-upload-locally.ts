#!/usr/bin/env tsx
/**
 * Test the full trade-ins parsing logic locally
 */

import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(process.cwd(), '.env.local') });

import * as fs from 'fs';
import { parseTradeIns } from '../lib/excel-parser';

async function testUpload() {
  const filePath = join(process.cwd(), 'Business Logic Files', 'standardized_2025-08 Apple.xlsx');

  // Create a File-like object
  const buffer = fs.readFileSync(filePath);
  const file = new File([buffer], 'standardized_2025-08 Apple.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  console.log('Parsing file...');
  const supplierId = 'test-supplier-id';

  try {
    const { tradeIns, errors } = await parseTradeIns(file, supplierId);

    console.log(`\nParsing complete:`);
    console.log(`  Trade-ins: ${tradeIns.length}`);
    console.log(`  Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\nFirst 10 errors:');
      errors.slice(0, 10).forEach(err => console.log('  -', err));
    }

    if (tradeIns.length > 0) {
      console.log('\nFirst 3 trade-ins:');
      tradeIns.slice(0, 3).forEach((t, i) => {
        console.log(`\n${i + 1}.`, {
          model: t.deviceModel,
          grade: t.grade,
          cost: t.cost,
          dateBooked: t.dateBooked,
          platform: t.platform,
          storage: t.storageVariant,
        });
      });
    }
  } catch (error: any) {
    console.error('Error parsing file:', error);
    console.error('Stack:', error.stack);
  }
}

testUpload()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
