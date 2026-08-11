import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireApiKey, ApiKeyPartner } from "@/lib/api-key-auth";
import { checkRateLimit } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// GET /api/v1/bulk-quotes/[id] — Get bulk quote with line items
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
    const doc = await adminDb.collection("bulkQuotes").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = doc.data()!;

    // Ownership check
    if (data.partnerId !== partner.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch device lines
    const devicesSnapshot = await doc.ref.collection("devices").get();

    const devices = devicesSnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({
      id: doc.id,
      type: data.type,
      category: data.category ?? null,
      assumedGrade: data.assumedGrade,
      totalDevices: data.totalDevices,
      totalIndicativeNZD: data.totalIndicativeNZD,
      totalPublicNZD: data.totalPublicNZD ?? null,
      totalIndicative: data.totalIndicativeDisplay ?? data.totalIndicativeNZD,
      totalPublic: data.totalPublicDisplay ?? data.totalPublicNZD ?? null,
      displayCurrency: data.displayCurrency ?? "NZD",
      matchedCount: data.matchedCount,
      unmatchedCount: data.unmatchedCount,
      status: data.status,
      partnerMode: data.partnerMode,
      partnerRateDiscount: data.partnerRateDiscount,
      source: data.source ?? null,
      createdAt: serializeTimestamp(data.createdAt),
      acceptedAt: serializeTimestamp(data.acceptedAt),
      devices,
    });
  } catch (error) {
    console.error("Error fetching v1 bulk quote:", error);
    return NextResponse.json(
      { error: "Failed to fetch bulk quote" },
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
