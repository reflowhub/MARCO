import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";
import { requirePartner } from "@/lib/partner-auth";
import { PartnerSession } from "@/lib/partner-auth";
import { checkRevisionExpiry } from "@/lib/revision-expiry";

// ---------------------------------------------------------------------------
// GET /api/partner/quotes/[id] — Get a single quote, verify ownership
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePartner(request);
  if (result instanceof NextResponse) return result;
  const partner: PartnerSession = result;

  try {
    const { id } = await params;

    // Check for revision expiry
    await checkRevisionExpiry("quotes", id);

    // Try single quote first
    const quoteDoc = await adminDb.collection("quotes").doc(id).get();
    if (quoteDoc.exists) {
      const data = quoteDoc.data()!;
      if (data.partnerId !== partner.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // Fetch device info
      let device: Record<string, unknown> | null = null;
      if (data.deviceId) {
        const deviceDoc = await adminDb
          .collection("devices")
          .doc(data.deviceId)
          .get();
        if (deviceDoc.exists) {
          device = deviceDoc.data() as Record<string, unknown>;
        }
      }

      return NextResponse.json({
        id: quoteDoc.id,
        type: "quote",
        deviceId: data.deviceId,
        deviceMake: device?.make ?? "",
        deviceModel: device?.model ?? "",
        deviceStorage: device?.storage ?? "",
        grade: data.grade,
        quotePriceNZD: data.quotePriceNZD,
        publicPriceNZD: data.publicPriceNZD ?? null,
        displayCurrency: data.displayCurrency ?? "NZD",
        status: data.status,
        partnerMode: data.partnerMode ?? null,
        customerName: data.customerName ?? null,
        customerEmail: data.customerEmail ?? null,
        customerPhone: data.customerPhone ?? null,
        inspectionGrade: data.inspectionGrade ?? null,
        revisedPriceNZD: data.revisedPriceNZD ?? null,
        revisedDeviceId: data.revisedDeviceId ?? null,
        revisedDeviceMake: data.revisedDeviceMake ?? null,
        revisedDeviceModel: data.revisedDeviceModel ?? null,
        revisedDeviceStorage: data.revisedDeviceStorage ?? null,
        revisedAt: serializeTimestamp(data.revisedAt),
        revisionExpiresAt: serializeTimestamp(data.revisionExpiresAt),
        returningAt: serializeTimestamp(data.returningAt),
        returnedAt: serializeTimestamp(data.returnedAt),
        createdAt: serializeTimestamp(data.createdAt),
        expiresAt: serializeTimestamp(data.expiresAt),
        acceptedAt: serializeTimestamp(data.acceptedAt),
      });
    }

    // Try bulk quote
    const bulkDoc = await adminDb.collection("bulkQuotes").doc(id).get();
    if (bulkDoc.exists) {
      const data = bulkDoc.data()!;
      if (data.partnerId !== partner.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json({
        id: bulkDoc.id,
        type: "bulkQuote",
        items: data.items ?? [],
        totalNZD: data.totalNZD ?? null,
        status: data.status,
        partnerMode: data.partnerMode ?? null,
        customerName: data.customerName ?? data.businessName ?? null,
        customerEmail: data.customerEmail ?? null,
        createdAt: serializeTimestamp(data.createdAt),
        acceptedAt: serializeTimestamp(data.acceptedAt),
      });
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching partner quote:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/partner/quotes/[id] — Respond to a revised quote
// ---------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePartner(request);
  if (result instanceof NextResponse) return result;
  const partner: PartnerSession = result;

  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!["accept_revision", "reject_revision"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept_revision' or 'reject_revision'" },
        { status: 400 }
      );
    }

    const quoteRef = adminDb.collection("quotes").doc(id);
    const quoteDoc = await quoteRef.get();

    if (!quoteDoc.exists || quoteDoc.data()!.partnerId !== partner.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = quoteDoc.data()!;

    if (data.status !== "revised") {
      return NextResponse.json(
        { error: "Quote is not in revised status" },
        { status: 400 }
      );
    }

    // Check expiry
    if (data.revisionExpiresAt?.toDate) {
      if (data.revisionExpiresAt.toDate() < new Date()) {
        return NextResponse.json(
          { error: "Revision response period has expired" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (action === "accept_revision") {
      updateData.status = "inspected";
      updateData.revisionAcceptedAt =
        admin.firestore.FieldValue.serverTimestamp();
    } else {
      updateData.status = "returning";
      updateData.returningAt =
        admin.firestore.FieldValue.serverTimestamp();
      updateData.revisionRejectedAt =
        admin.firestore.FieldValue.serverTimestamp();
    }

    await quoteRef.update(updateData);

    return NextResponse.json({
      id,
      status: action === "accept_revision" ? "inspected" : "returning",
    });
  } catch (error) {
    console.error("Error responding to revision:", error);
    return NextResponse.json(
      { error: "Failed to respond to revision" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serializeTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const ts = value as { toDate: () => Date };
    return ts.toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}
