// Firebase Firestore collection names and helper functions
import {
  collection,
  CollectionReference,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Supplier,
  Customer,
  ModelLibraryDevice,
  TradeIn,
  CustomerBid,
  FileUpload,
  Auction
} from './types';

// Collection names
export const COLLECTIONS = {
  SUPPLIERS: 'suppliers',
  CUSTOMERS: 'customers',
  MODEL_LIBRARY: 'modelLibrary',
  TRADE_INS: 'tradeIns',
  CUSTOMER_BIDS: 'customerBids',
  UPLOAD_HISTORY: 'uploadHistory',
  AUCTIONS: 'auctions',
} as const;

// Typed collection references
export const suppliersCollection = () =>
  collection(db, COLLECTIONS.SUPPLIERS) as CollectionReference<Supplier>;

export const customersCollection = () =>
  collection(db, COLLECTIONS.CUSTOMERS) as CollectionReference<Customer>;

export const modelLibraryCollection = () =>
  collection(db, COLLECTIONS.MODEL_LIBRARY) as CollectionReference<ModelLibraryDevice>;

export const tradeInsCollection = () =>
  collection(db, COLLECTIONS.TRADE_INS) as CollectionReference<TradeIn>;

export const customerBidsCollection = () =>
  collection(db, COLLECTIONS.CUSTOMER_BIDS) as CollectionReference<CustomerBid>;

export const uploadHistoryCollection = () =>
  collection(db, COLLECTIONS.UPLOAD_HISTORY) as CollectionReference<FileUpload>;

export const auctionsCollection = () =>
  collection(db, COLLECTIONS.AUCTIONS) as CollectionReference<Auction>;

// Helper function to convert Firestore timestamp to Date
export const firestoreTimestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

// Helper function to prepare data for Firestore (convert Dates to Timestamps)
export const prepareForFirestore = <T extends Record<string, any>>(data: T): DocumentData => {
  const prepared: any = {};

  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      prepared[key] = value;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      prepared[key] = prepareForFirestore(value);
    } else {
      prepared[key] = value;
    }
  }

  return prepared;
};
