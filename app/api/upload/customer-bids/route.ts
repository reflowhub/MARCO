import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { parseCustomerBids } from '@/lib/excel-parser';
import { COLLECTIONS } from '@/lib/firebase-collections';
import { Currency } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const customerId = formData.get('customerId') as string;
    const auctionDate = formData.get('auctionDate') as string;
    const currency = formData.get('currency') as Currency;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    if (!auctionDate) {
      return NextResponse.json({ error: 'Auction date required' }, { status: 400 });
    }

    if (!currency || !['USD', 'AUD'].includes(currency)) {
      return NextResponse.json({ error: 'Valid currency required (USD or AUD)' }, { status: 400 });
    }

    // Parse the Excel file
    const { bids, errors } = await parseCustomerBids(
      file,
      customerId,
      new Date(auctionDate),
      currency as 'USD' | 'AUD'
    );

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Parsing errors', details: errors },
        { status: 400 }
      );
    }

    // Store bids in Firestore
    const batch = adminDb.batch();
    const bidsRef = adminDb.collection(COLLECTIONS.CUSTOMER_BIDS);

    bids.forEach((bid) => {
      const docRef = bidsRef.doc();
      batch.set(docRef, {
        ...bid,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    await batch.commit();

    // Log upload history
    const uploadHistoryRef = adminDb.collection(COLLECTIONS.UPLOAD_HISTORY).doc();
    await uploadHistoryRef.set({
      id: uploadHistoryRef.id,
      fileName: file.name,
      fileType: 'customer-bids',
      uploadDate: new Date(),
      uploadedBy: 'system', // TODO: Get from auth
      customerId,
      auctionDate: new Date(auctionDate),
      recordsProcessed: bids.length,
      status: 'completed',
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      recordsProcessed: bids.length,
    });
  } catch (error: any) {
    console.error('Customer bids upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', message: error.message },
      { status: 500 }
    );
  }
}
