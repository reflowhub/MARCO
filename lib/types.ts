// Core data models for MARCO

export type Currency = 'NZD' | 'USD' | 'AUD';

export interface Supplier {
  id: string;
  name: string;
  country: string;
  currency: Currency;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  country: string;
  preferredCurrency: Currency;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelLibraryDevice {
  id: string;
  manufacturer: string;
  model: string;
  storageVariant: string;
  platform: 'Android' | 'Apple';
  specifications?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradeIn {
  id: string;
  supplierId: string;
  deviceModel: string;
  storageVariant?: string;
  grade: string;
  costNZD: number;
  dateBooked: Date; // Date supplier recorded the trade-in
  auctionDate?: Date; // Date we tender out the lot
  soldDate?: Date; // Date we award the lot
  platform: 'Android' | 'Apple';
  status: 'pending' | 'auction' | 'sold';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerBid {
  id: string;
  customerId: string;
  auctionDate: Date;
  deviceModel: string;
  storageVariant?: string;
  grade: string;
  bidAmount: number;
  currency: Currency;
  platform: 'Android' | 'Apple';
  quantity?: number;
  status: 'pending' | 'accepted' | 'rejected';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileUpload {
  id: string;
  fileName: string;
  fileType: 'model-library' | 'trade-ins' | 'customer-bids';
  uploadDate: Date;
  uploadedBy: string; // User ID
  fileUrl: string; // Firebase Storage URL
  supplierId?: string; // For trade-in files
  customerId?: string; // For customer bid files
  auctionDate?: Date; // For auction-related files
  recordsProcessed: number;
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
}

export interface Auction {
  id: string;
  auctionDate: Date;
  platform: 'Android' | 'Apple';
  tradeInIds: string[]; // References to TradeIn records
  status: 'draft' | 'active' | 'closed' | 'awarded';
  totalDevices: number;
  totalCostNZD: number;
  winningCustomerId?: string;
  winningBidAmount?: number;
  winningBidCurrency?: Currency;
  soldDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics and reporting types
export interface LeadTimeMetrics {
  averageDaysBookedToAuction: number;
  averageDaysAuctionToSold: number;
  averageTotalLeadTime: number;
}

export interface InventoryMetrics {
  totalDevices: number;
  totalCostNZD: number;
  byPlatform: {
    Android: number;
    Apple: number;
  };
  byGrade: Record<string, number>;
  byStatus: {
    pending: number;
    auction: number;
    sold: number;
  };
}
