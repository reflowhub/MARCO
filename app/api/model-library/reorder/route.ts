import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/firebase-collections';

// Use Node.js runtime for Firebase Admin
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Invalid updates array' },
        { status: 400 }
      );
    }

    // Batch update sortOrder for all devices
    const batchSize = 500;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = adminDb.batch();
      const chunk = updates.slice(i, i + batchSize);

      chunk.forEach(({ id, sortOrder }: { id: string; sortOrder: number }) => {
        const docRef = adminDb.collection(COLLECTIONS.MODEL_LIBRARY).doc(id);
        batch.update(docRef, {
          sortOrder,
          updatedAt: new Date(),
        });
      });

      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      updated: updates.length,
    });
  } catch (error: any) {
    console.error('Reorder error:', error);
    return NextResponse.json(
      { error: 'Failed to update order', message: error.message },
      { status: 500 }
    );
  }
}
