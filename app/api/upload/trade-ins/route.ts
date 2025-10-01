import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { parseTradeIns } from '@/lib/excel-parser';
import { COLLECTIONS } from '@/lib/firebase-collections';

// Use Node.js runtime for Firebase Admin
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('Trade-ins upload route called');

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const supplierId = formData.get('supplierId') as string;
    const purchaseDate = formData.get('purchaseDate') as string;
    const currency = formData.get('currency') as string;

    console.log('Upload params:', {
      fileName: file?.name,
      fileSize: file?.size,
      supplierId,
      currency,
      hasPurchaseDate: !!purchaseDate
    });

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID required' }, { status: 400 });
    }

    if (!currency) {
      return NextResponse.json({ error: 'Currency required' }, { status: 400 });
    }

    // Parse the Excel file
    console.log('Starting Excel parsing...');
    const { tradeIns, errors } = await parseTradeIns(file, supplierId);
    console.log(`Parsing complete: ${tradeIns.length} devices, ${errors.length} errors`);

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Parsing errors', details: errors },
        { status: 400 }
      );
    }

    // Store trade-ins in Firestore (batch max 500 operations)
    console.log('Writing to Firestore...');
    const tradeInsRef = adminDb.collection(COLLECTIONS.TRADE_INS);
    const batchSize = 500;

    for (let i = 0; i < tradeIns.length; i += batchSize) {
      const batch = adminDb.batch();
      const chunk = tradeIns.slice(i, i + batchSize);

      chunk.forEach((tradeIn) => {
        const docRef = tradeInsRef.doc();
        batch.set(docRef, {
          ...tradeIn,
          id: docRef.id,
          currency,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      await batch.commit();
      console.log(`Committed batch ${Math.floor(i / batchSize) + 1}: ${chunk.length} records`);
    }

    console.log('All batches committed successfully');

    // Log upload history
    const uploadHistoryRef = adminDb.collection(COLLECTIONS.UPLOAD_HISTORY).doc();
    await uploadHistoryRef.set({
      id: uploadHistoryRef.id,
      fileName: file.name,
      fileType: 'trade-ins',
      uploadDate: new Date(),
      uploadedBy: 'system', // TODO: Get from auth
      supplierId,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      recordsProcessed: tradeIns.length,
      status: 'completed',
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      recordsProcessed: tradeIns.length,
    });
  } catch (error: any) {
    console.error('Trade-ins upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', message: error.message },
      { status: 500 }
    );
  }
}
