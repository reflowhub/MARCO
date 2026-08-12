import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";
import { findOrCreateCustomer } from "@/lib/customer-link";
import { sendEmail } from "@/lib/email";
import QuoteAcceptedEmail from "@/emails/quote-accepted";
import { checkRevisionExpiry } from "@/lib/revision-expiry";

// GET /api/quote/[id] — Get a quote by ID, including device info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check for revision expiry (auto-transitions if expired)
    await checkRevisionExpiry("quotes", id);

    const quoteDoc = await adminDb.collection("quotes").doc(id).get();

    if (!quoteDoc.exists) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const quoteData = quoteDoc.data();

    // Fetch device info
    let device = null;
    if (quoteData?.deviceId) {
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

    // Serialize Firestore Timestamps to ISO strings
    const serializedQuote: Record<string, unknown> = {
      id: quoteDoc.id,
      ...quoteData,
    };

    if (quoteData?.createdAt?.toDate) {
      serializedQuote.createdAt = quoteData.createdAt.toDate().toISOString();
    }
    if (quoteData?.expiresAt?.toDate) {
      serializedQuote.expiresAt = quoteData.expiresAt.toDate().toISOString();
    }
    if (quoteData?.acceptedAt?.toDate) {
      serializedQuote.acceptedAt = quoteData.acceptedAt.toDate().toISOString();
    }
    if (quoteData?.revisedAt?.toDate) {
      serializedQuote.revisedAt = quoteData.revisedAt.toDate().toISOString();
    }
    if (quoteData?.revisionExpiresAt?.toDate) {
      serializedQuote.revisionExpiresAt = quoteData.revisionExpiresAt
        .toDate()
        .toISOString();
    }
    if (quoteData?.returningAt?.toDate) {
      serializedQuote.returningAt = quoteData.returningAt.toDate().toISOString();
    }
    if (quoteData?.returnedAt?.toDate) {
      serializedQuote.returnedAt = quoteData.returnedAt.toDate().toISOString();
    }

    return NextResponse.json({
      ...serializedQuote,
      device,
    });
  } catch (error) {
    console.error("Error fetching quote:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote" },
      { status: 500 }
    );
  }
}

// PUT /api/quote/[id] — Accept a quote with customer details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // --- Handle revision response ---
    if (
      body.action === "accept_revision" ||
      body.action === "reject_revision"
    ) {
      const quoteRef = adminDb.collection("quotes").doc(id);
      const quoteDoc = await quoteRef.get();

      if (!quoteDoc.exists) {
        return NextResponse.json(
          { error: "Quote not found" },
          { status: 404 }
        );
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

      if (body.action === "accept_revision") {
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

      // Re-fetch and serialize
      const updatedDoc = await quoteRef.get();
      const updatedData = updatedDoc.data();
      const serialized: Record<string, unknown> = {
        id: updatedDoc.id,
        ...updatedData,
      };

      // Serialize timestamps
      for (const field of [
        "createdAt",
        "expiresAt",
        "acceptedAt",
        "revisedAt",
        "revisionExpiresAt",
        "returningAt",
        "returnedAt",
        "revisionAcceptedAt",
        "revisionRejectedAt",
      ]) {
        if (updatedData?.[field]?.toDate) {
          serialized[field] = updatedData[field].toDate().toISOString();
        }
      }

      return NextResponse.json(serialized);
    }

    // --- Original acceptance flow ---
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      paymentMethod,
      payIdPhone,
      bankBSB,
      bankAccountNumber,
      bankAccountName,
      imei,
    } = body;

    // Validate required fields
    if (!customerName || !customerEmail || !customerPhone || !shippingAddress || !paymentMethod) {
      return NextResponse.json(
        {
          error:
            "customerName, customerEmail, customerPhone, shippingAddress, and paymentMethod are required",
        },
        { status: 400 }
      );
    }

    // Validate payment method
    if (!["payid", "bank_transfer"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "paymentMethod must be 'payid' or 'bank_transfer'" },
        { status: 400 }
      );
    }

    // Validate payment details based on method
    if (paymentMethod === "payid" && !payIdPhone) {
      return NextResponse.json(
        { error: "payIdPhone is required for PayID payment method" },
        { status: 400 }
      );
    }

    if (
      paymentMethod === "bank_transfer" &&
      (!bankBSB || !bankAccountNumber || !bankAccountName)
    ) {
      return NextResponse.json(
        {
          error:
            "bankBSB, bankAccountNumber, and bankAccountName are required for bank transfer",
        },
        { status: 400 }
      );
    }

    // Get existing quote
    const quoteRef = adminDb.collection("quotes").doc(id);
    const quoteDoc = await quoteRef.get();

    if (!quoteDoc.exists) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const existingData = quoteDoc.data();

    // Check quote is still in "quoted" status
    if (existingData?.status !== "quoted") {
      return NextResponse.json(
        { error: "Quote has already been processed" },
        { status: 400 }
      );
    }

    // Check quote hasn't expired
    if (existingData?.expiresAt?.toDate) {
      const expiryDate = existingData.expiresAt.toDate();
      if (expiryDate < new Date()) {
        return NextResponse.json(
          { error: "Quote has expired" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: "accepted",
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      paymentMethod,
    };

    if (paymentMethod === "payid") {
      updateData.payIdPhone = payIdPhone;
    } else {
      updateData.bankBSB = bankBSB;
      updateData.bankAccountNumber = bankAccountNumber;
      updateData.bankAccountName = bankAccountName;
    }

    // Accept IMEI if provided and quote doesn't already have one
    if (imei && typeof imei === "string" && /^\d{15}$/.test(imei) && !existingData?.imei) {
      updateData.imei = imei;
    }

    await quoteRef.update(updateData);

    // Auto-create/link customer record
    try {
      const customerId = await findOrCreateCustomer({
        type: "individual",
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        shippingAddress,
        paymentMethod,
        payIdPhone: paymentMethod === "payid" ? payIdPhone : null,
        bankBSB: paymentMethod === "bank_transfer" ? bankBSB : null,
        bankAccountNumber: paymentMethod === "bank_transfer" ? bankAccountNumber : null,
        bankAccountName: paymentMethod === "bank_transfer" ? bankAccountName : null,
        quoteId: id,
        quoteValueNZD: existingData?.quotePriceNZD ?? 0,
      });
      await quoteRef.update({ customerId });
    } catch (err) {
      console.error("Customer link error (non-blocking):", err);
    }

    // Fetch updated quote
    const updatedDoc = await quoteRef.get();
    const updatedData = updatedDoc.data();

    // Serialize timestamps
    const serializedQuote: Record<string, unknown> = {
      id: updatedDoc.id,
      ...updatedData,
    };

    if (updatedData?.createdAt?.toDate) {
      serializedQuote.createdAt = updatedData.createdAt.toDate().toISOString();
    }
    if (updatedData?.expiresAt?.toDate) {
      serializedQuote.expiresAt = updatedData.expiresAt.toDate().toISOString();
    }
    if (updatedData?.acceptedAt?.toDate) {
      serializedQuote.acceptedAt = updatedData.acceptedAt
        .toDate()
        .toISOString();
    }

    // Fetch device info
    let device = null;
    if (updatedData?.deviceId) {
      const deviceDoc = await adminDb
        .collection("devices")
        .doc(updatedData.deviceId)
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

    // Send acceptance confirmation email (non-blocking)
    const deviceLabel = device
      ? `${device.make} ${device.model} ${device.storage}`.trim()
      : "your device";
    sendEmail({
      to: customerEmail,
      subject: "Your trade-in quote has been accepted",
      react: QuoteAcceptedEmail({
        customerName,
        deviceName: deviceLabel,
        quotePrice: existingData?.quotePriceDisplay ?? existingData?.quotePriceNZD ?? 0,
        currency: existingData?.displayCurrency ?? "AUD",
        quoteId: id,
      }),
    });

    return NextResponse.json({
      ...serializedQuote,
      device,
    });
  } catch (error) {
    console.error("Error accepting quote:", error);
    return NextResponse.json(
      { error: "Failed to accept quote" },
      { status: 500 }
    );
  }
}
