import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { parseModelLibrary } from '@/lib/excel-parser';
import { COLLECTIONS } from '@/lib/firebase-collections';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Parse the Excel file
    const { devices, errors } = await parseModelLibrary(file);

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Parsing errors', details: errors },
        { status: 400 }
      );
    }

    // Store devices in Firestore
    const batch = adminDb.batch();
    const modelLibraryRef = adminDb.collection(COLLECTIONS.MODEL_LIBRARY);

    devices.forEach((device) => {
      const docRef = modelLibraryRef.doc();
      batch.set(docRef, {
        ...device,
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
      fileType: 'model-library',
      uploadDate: new Date(),
      uploadedBy: 'system', // TODO: Get from auth
      recordsProcessed: devices.length,
      status: 'completed',
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      recordsProcessed: devices.length,
    });
  } catch (error: any) {
    console.error('Model library upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', message: error.message },
      { status: 500 }
    );
  }
}
