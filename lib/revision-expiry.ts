import { adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";

/**
 * Check if a quote's revision has expired.
 * If the status is "revised" and `revisionExpiresAt` is in the past,
 * auto-transition to "returning" and flag as auto-expired.
 *
 * Call this from GET handlers that return quote data so expiry is
 * enforced lazily (no cron required).
 *
 * @returns true if the quote was auto-transitioned
 */
export async function checkRevisionExpiry(
  collection: string,
  docId: string
): Promise<boolean> {
  const ref = adminDb.collection(collection).doc(docId);
  const doc = await ref.get();
  if (!doc.exists) return false;

  const data = doc.data()!;
  if (data.status !== "revised") return false;

  const expiresAt = data.revisionExpiresAt;
  if (!expiresAt) return false;

  const expiryDate = expiresAt.toDate
    ? expiresAt.toDate()
    : new Date(expiresAt);
  if (expiryDate > new Date()) return false;

  // Expired — auto-transition to returning
  await ref.update({
    status: "returning",
    returningAt: admin.firestore.FieldValue.serverTimestamp(),
    revisionAutoExpired: true,
  });

  return true;
}
