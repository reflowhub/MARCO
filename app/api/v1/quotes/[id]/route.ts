import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireApiKey, ApiKeyPartner } from "@/lib/api-key-auth";
import { checkRateLimit } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// GET /api/v1/quotes/[id] — Get quote status with device info
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth
  const result = await requireApiKey(request);
  if (result instanceof NextResponse) return result;
  const partner: ApiKeyPartner = result;

  // Rate limit
  const rl = checkRateLimit(partner.apiKeyId);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    const { id } = await params;
    const quoteDoc = await adminDb.collection("quotes").doc(id).get();

    if (!quoteDoc.exists) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const quoteData = quoteDoc.data()!;

    // Ownership check
    if (quoteData.partnerId !== partner.id) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Fetch device info
    let device = null;
    if (quoteData.deviceId) {
      const deviceDoc = await adminDb
        .collection("devices")
        .doc(quoteData.deviceId)
        .get();

      if (deviceDoc.exists) {
        const deviceData = deviceDoc.data();
        device = {
          id: deviceDoc.id,
          make: deviceData?.make,
          model: deviceData?.model,
          storage: deviceData?.storage,
        };
      }
    }

    // Serialize timestamps
    const serialized: Record<string, unknown> = {
      id: quoteDoc.id,
      deviceId: quoteData.deviceId,
      grade: quoteData.grade,
      quotePriceNZD: quoteData.quotePriceNZD,
      publicPriceNZD: quoteData.publicPriceNZD ?? null,
      quotePrice: quoteData.quotePriceDisplay ?? quoteData.quotePriceNZD,
      displayCurrency: quoteData.displayCurrency ?? "NZD",
      partnerRateDiscount: quoteData.partnerRateDiscount ?? null,
      status: quoteData.status,
      source: quoteData.source ?? null,
      imei: quoteData.imei ?? null,
      customerName: quoteData.customerName ?? null,
      customerEmail: quoteData.customerEmail ?? null,
      createdAt: serializeTimestamp(quoteData.createdAt),
      expiresAt: serializeTimestamp(quoteData.expiresAt),
      acceptedAt: serializeTimestamp(quoteData.acceptedAt),
      device,
    };

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching v1 quote:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helper
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
