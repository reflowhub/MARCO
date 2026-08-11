// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter (per API key)
// ---------------------------------------------------------------------------

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 300; // per window

const store = new Map<string, number[]>();
let callCount = 0;

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export function checkRateLimit(keyId: string): RateLimitResult {
  const now = Date.now();

  // Periodic cleanup — every 100 calls, prune stale entries
  callCount++;
  if (callCount % 100 === 0) {
    for (const [k, timestamps] of store) {
      const filtered = timestamps.filter((t) => now - t < WINDOW_MS);
      if (filtered.length === 0) {
        store.delete(k);
      } else {
        store.set(k, filtered);
      }
    }
  }

  let timestamps = store.get(keyId);
  if (!timestamps) {
    timestamps = [];
    store.set(keyId, timestamps);
  }

  // Remove timestamps outside the window
  const windowStart = now - WINDOW_MS;
  while (timestamps.length > 0 && timestamps[0] < windowStart) {
    timestamps.shift();
  }

  if (timestamps.length >= MAX_REQUESTS) {
    // Oldest timestamp in window — calculate when it will expire
    const retryAfter = Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  timestamps.push(now);
  return { allowed: true };
}
