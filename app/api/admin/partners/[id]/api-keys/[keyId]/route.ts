import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/admin-auth";

// ---------------------------------------------------------------------------
// DELETE /api/admin/partners/[id]/api-keys/[keyId] — Revoke an API key
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  const adminUser = await requireAdmin(request);
  if (adminUser instanceof NextResponse) return adminUser;

  try {
    const { id, keyId } = await params;

    const keyDoc = await adminDb.collection("apiKeys").doc(keyId).get();
    if (!keyDoc.exists) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    const keyData = keyDoc.data()!;

    // Verify key belongs to this partner
    if (keyData.partnerId !== id) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    if (keyData.status === "revoked") {
      return NextResponse.json(
        { error: "API key is already revoked" },
        { status: 400 }
      );
    }

    await adminDb.collection("apiKeys").doc(keyId).update({
      status: "revoked",
      revokedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking API key:", error);
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}
