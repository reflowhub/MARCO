export interface Device {
  id: string;
  deviceId: string;
  make: string;
  model: string;
  grade: string;
  costNZD?: number;
  costUSD?: number;
  category: 'Android' | 'Apple';
  dateReceived?: Date;
  batchId?: string;
}

export interface Batch {
  id: string;
  month: string; // Format: YYYY-MM
  platform: 'Android' | 'Apple';
  devices: Device[];
  totalCostNZD: number;
  totalCostUSD?: number;
  status: 'processing' | 'standardized' | 'bidding' | 'sold';
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  company?: string;
  createdAt: Date;
}

export interface Bid {
  id: string;
  customerId: string;
  batchId: string;
  amountUSD: number;
  status: 'pending' | 'accepted' | 'rejected';
  notes?: string;
  submittedAt: Date;
}