#!/usr/bin/env tsx
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'Business Logic Files', 'Model Library Variant v1.1.xlsx');
const fileBuffer = fs.readFileSync(filePath);
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

console.log('Sheet names:', workbook.SheetNames);
console.log('\nFirst sheet:', workbook.SheetNames[0]);

const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet, { range: 0, defval: null });

console.log('\nTotal rows:', data.length);
console.log('\nFirst 5 rows:');
data.slice(0, 5).forEach((row, i) => {
  console.log(`\nRow ${i + 1}:`, JSON.stringify(row, null, 2));
});

console.log('\nColumn names:');
if (data[0]) {
  console.log(Object.keys(data[0]));
}
