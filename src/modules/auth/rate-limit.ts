/**
 * In-memory sliding window rate limiter and in-flight lock for authentication operations.
 *
 * Provides:
 * - Rate limiting by normalized key (email / IP)
 * - In-flight lock to prevent race conditions & duplicate submissions
 * - Automatic eviction of expired rate limit entries
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const inFlightRequests = new Set<string>();

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * Checks and increments rate limit counter for a given key.
 *
 * @param key Unique identifier (e.g. `signup_email_user@example.com`)
 * @param maxAttempts Max allowed attempts within the window
 * @param windowMs Time window in milliseconds (default: 15 minutes)
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): RateLimitCheckResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true };
}

/**
 * Resets rate limit for a specific key (e.g. on test cleanup).
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Acquires a mutex lock for in-flight requests to prevent double-submit races.
 */
export function acquireInFlightLock(key: string): boolean {
  if (inFlightRequests.has(key)) {
    return false;
  }
  inFlightRequests.add(key);
  return true;
}

/**
 * Releases the mutex lock.
 */
export function releaseInFlightLock(key: string): void {
  inFlightRequests.delete(key);
}

// Periodic cleanup every 10 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 10 * 60 * 1000);

  if (timer.unref) {
    timer.unref();
  }
}
