// Rate limiting and Gnani call helpers.
//
// NOTE on serialization: Vercel serverless instances do not share memory, so an
// in-process mutex does NOT serialize across instances/accounts. The Gnani
// account allows only ONE active request at a time (429 otherwise). For the
// demo we (a) serialize within an instance, (b) retry on 429 with backoff, and
// (c) keep the demo flow sequential. For production, replace with a
// DB-backed advisory lock (Supabase) or a single worker. See docs.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limitPerMin: number): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const windowMs = 60_000;
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (b.count >= limitPerMin) {
    return { allowed: false, retryAfterMs: b.resetAt - now };
  }
  b.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

// In-process async mutex (per instance only).
let lock: Promise<void> = Promise.resolve();
export async function withGnaniLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = lock;
  let resolveLock!: () => void;
  lock = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });
  await prev;
  try {
    return await fn();
  } finally {
    resolveLock();
  }
}

// Retry a Gnani call on 429 with exponential backoff.
export async function with429Backoff<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const status = (e as { status?: number })?.status;
      if (status !== 429) throw e;
      const delay = Math.min(1000 * 2 ** i, 8000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}