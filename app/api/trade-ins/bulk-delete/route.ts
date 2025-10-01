import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/firebase-collections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: ids array is required' },
        { status: 400 }
      );
    }

    console.log(`Deleting ${ids.length} trade-ins...`);

    // Firestore batch has a limit of 500 operations
    const batchSize = 500;
    const tradeInsRef = adminDb.collection(COLLECTIONS.TRADE_INS);

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = adminDb.batch();
      const chunk = ids.slice(i, i + batchSize);

      chunk.forEach((id: string) => {
        const docRef = tradeInsRef.doc(id);
        batch.delete(docRef);
      });

      await batch.commit();
      console.log(`Deleted batch ${Math.floor(i / batchSize) + 1} (${chunk.length} items)`);
    }

    console.log(`Successfully deleted ${ids.length} trade-ins`);

    return NextResponse.json({
      success: true,
      deleted: ids.length,
    });
  } catch (error: any) {
    console.error('Error deleting trade-ins:', error);
    return NextResponse.json(
      { error: 'Failed to delete trade-ins', details: error.message },
      { status: 500 }
    );
  }
}
