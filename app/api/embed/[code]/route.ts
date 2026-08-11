import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// GET /api/embed/[code] — public endpoint to validate partner and return widget config
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (normalizedCode.length < 3) {
      return NextResponse.json({ valid: false });
    }

    const snapshot = await adminDb
      .collection("partners")
      .where("code", "==", normalizedCode)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ valid: false });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Must have widget enabled and Mode A
    if (!data.widgetEnabled || !data.modes?.includes("A")) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      partnerName: data.name ?? "",
      partnerId: doc.id,
      widgetPrimaryColor: data.widgetPrimaryColor ?? null,
      widgetLogoUrl: data.widgetLogoUrl ?? null,
      widgetCustomHeading: data.widgetCustomHeading ?? null,
    });
  } catch (error) {
    console.error("Error validating embed partner:", error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
