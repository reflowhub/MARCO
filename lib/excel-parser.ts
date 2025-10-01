// Excel file parsing utilities for MARCO
import * as XLSX from 'xlsx';
import { ModelLibraryDevice, TradeIn, CustomerBid } from './types';

export interface ParsedModelLibrary {
  devices: Partial<ModelLibraryDevice>[];
  errors: string[];
}

export interface ParsedTradeIns {
  tradeIns: Partial<TradeIn>[];
  errors: string[];
}

export interface ParsedCustomerBids {
  bids: Partial<CustomerBid>[];
  errors: string[];
}

/**
 * Parse Model Library Excel file
 * Expected columns: Manufacturer, Model, Storage Variant, Platform, [other specs]
 */
export async function parseModelLibrary(file: File): Promise<ParsedModelLibrary> {
  const devices: Partial<ModelLibraryDevice>[] = [];
  const errors: string[] = [];

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet);

    data.forEach((row: any, index: number) => {
      try {
        const device: Partial<ModelLibraryDevice> = {
          manufacturer: row['Manufacturer'] || row['manufacturer'],
          model: row['Model'] || row['model'],
          storageVariant: row['Storage Variant'] || row['storage_variant'] || row['Storage'],
          platform: (row['Platform'] || row['platform']) as 'Android' | 'Apple',
          specifications: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Extract other columns as specifications
        Object.keys(row).forEach((key) => {
          if (!['Manufacturer', 'manufacturer', 'Model', 'model', 'Storage Variant', 'storage_variant', 'Storage', 'Platform', 'platform'].includes(key)) {
            if (device.specifications) {
              device.specifications[key] = row[key];
            }
          }
        });

        // Validate required fields
        if (!device.manufacturer || !device.model) {
          errors.push(`Row ${index + 2}: Missing manufacturer or model`);
        } else {
          devices.push(device);
        }
      } catch (error: any) {
        errors.push(`Row ${index + 2}: ${error.message}`);
      }
    });
  } catch (error: any) {
    errors.push(`File parsing error: ${error.message}`);
  }

  return { devices, errors };
}

/**
 * Parse Standardized Trade-In Excel file
 * Expected columns: Date Booked, Model, Grade, Cost (NZD), Storage, Platform
 */
export async function parseTradeIns(file: File, supplierId: string): Promise<ParsedTradeIns> {
  const tradeIns: Partial<TradeIn>[] = [];
  const errors: string[] = [];

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet);

    data.forEach((row: any, index: number) => {
      try {
        // Try multiple column name variations
        const dateBooked = row['Date Booked'] || row['Date_Booked'] || row['date_booked'] || row['Date'] || row['date'];
        const costValue = row['Cost'] || row['cost'] || row['Price'] || row['price'] || row['Cost (NZD)'] || row['cost_nzd'];

        // Model can be in multiple fields
        const modelValue = row['Model'] || row['model'] || row['Library_Model_Storage'];

        // Storage variant extraction
        const storageVariant = row['Storage'] || row['storage'] || row['Storage Variant'];

        // Platform detection from multiple fields
        let platform: 'Android' | 'Apple' = 'Android';
        const platformField = row['Platform'] || row['platform'];
        const manufacturer = row['Manufacturer'] || row['Library_Make'] || row['Make'];

        if (platformField) {
          platform = platformField as 'Android' | 'Apple';
        } else if (manufacturer) {
          // Auto-detect platform from manufacturer
          platform = manufacturer.toLowerCase().includes('apple') ? 'Apple' : 'Android';
        } else if (modelValue && modelValue.toLowerCase().includes('iphone')) {
          platform = 'Apple';
        }

        const tradeIn: Partial<TradeIn> = {
          supplierId,
          deviceModel: modelValue,
          storageVariant,
          grade: row['Grade'] || row['grade'],
          cost: parseFloat(costValue),
          dateBooked: parseExcelDate(dateBooked),
          platform,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Validate required fields
        if (!tradeIn.deviceModel || !tradeIn.grade || typeof tradeIn.cost !== 'number' || isNaN(tradeIn.cost) || !tradeIn.dateBooked) {
          errors.push(`Row ${index + 2}: Missing or invalid required fields (Model, Grade, Cost, Date Booked)`);
        } else {
          tradeIns.push(tradeIn);
        }
      } catch (error: any) {
        errors.push(`Row ${index + 2}: ${error.message}`);
      }
    });
  } catch (error: any) {
    errors.push(`File parsing error: ${error.message}`);
  }

  return { tradeIns, errors };
}

/**
 * Parse Customer Bid Excel file
 * Expected columns: Model, Grade, Bid Amount, Storage, Platform
 * Currency is specified at upload time
 */
export async function parseCustomerBids(
  file: File,
  customerId: string,
  auctionDate: Date,
  currency: 'USD' | 'AUD'
): Promise<ParsedCustomerBids> {
  const bids: Partial<CustomerBid>[] = [];
  const errors: string[] = [];

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet);

    data.forEach((row: any, index: number) => {
      try {
        const bidAmount = row['Bid'] || row['bid'] || row['Bid Amount'] || row['bid_amount'] || row['Amount'];

        const bid: Partial<CustomerBid> = {
          customerId,
          auctionDate,
          deviceModel: row['Model'] || row['model'],
          storageVariant: row['Storage'] || row['storage'] || row['Storage Variant'],
          grade: row['Grade'] || row['grade'],
          bidAmount: parseFloat(bidAmount),
          currency,
          platform: (row['Platform'] || row['platform']) as 'Android' | 'Apple',
          quantity: row['Quantity'] || row['quantity'] || 1,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Validate required fields
        if (!bid.deviceModel || !bid.grade || typeof bid.bidAmount !== 'number' || isNaN(bid.bidAmount)) {
          errors.push(`Row ${index + 2}: Missing or invalid required fields (Model, Grade, Bid Amount)`);
        } else {
          bids.push(bid);
        }
      } catch (error: any) {
        errors.push(`Row ${index + 2}: ${error.message}`);
      }
    });
  } catch (error: any) {
    errors.push(`File parsing error: ${error.message}`);
  }

  return { bids, errors };
}

/**
 * Helper to parse Excel date values
 * Excel stores dates as numbers (days since 1900-01-01)
 */
function parseExcelDate(value: any): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number') {
    // Excel date number
    const date = XLSX.SSF.parse_date_code(value);
    return new Date(date.y, date.m - 1, date.d);
  }

  if (typeof value === 'string') {
    // Try to parse as string date
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  throw new Error(`Invalid date value: ${value}`);
}

/**
 * Export data to Excel for downloading
 */
export function exportToExcel(data: any[], fileName: string): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, fileName);
}
