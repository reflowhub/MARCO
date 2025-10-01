#!/usr/bin/env tsx
/**
 * Test parsing the Apple standardized file
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'Business Logic Files', 'standardized_2025-08 Apple.xlsx');
const fileBuffer = fs.readFileSync(filePath);
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

console.log('Sheet names:', workbook.SheetNames);
console.log('\nFirst sheet:', workbook.SheetNames[0]);

const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet);

console.log('\nTotal rows:', data.length);
console.log('\nFirst 3 rows:');
data.slice(0, 3).forEach((row, i) => {
  console.log(`\nRow ${i + 1}:`, JSON.stringify(row, null, 2));
});

console.log('\nColumn names:');
if (data[0]) {
  console.log(Object.keys(data[0]));
}

// Check for missing required fields
console.log('\nChecking for required fields (using new parser logic)...');
const errors: string[] = [];
data.forEach((row: any, index: number) => {
  const dateBooked = row['Date Booked'] || row['Date_Booked'] || row['date_booked'] || row['Date'] || row['date'];
  const costValue = row['Cost'] || row['cost'] || row['Price'] || row['price'] || row['Cost (NZD)'] || row['cost_nzd'];
  const model = row['Model'] || row['model'] || row['Library_Model_Storage'];
  const grade = row['Grade'] || row['grade'];

  if (!model) errors.push(`Row ${index + 2}: Missing model`);
  if (!grade) errors.push(`Row ${index + 2}: Missing grade`);
  if (!costValue) errors.push(`Row ${index + 2}: Missing cost`);
  if (!dateBooked) errors.push(`Row ${index + 2}: Missing date booked`);
});

console.log(`\nFound ${errors.length} errors`);
if (errors.length > 0) {
  console.log('\nFirst 10 errors:');
  errors.slice(0, 10).forEach(err => console.log('  -', err));
}
