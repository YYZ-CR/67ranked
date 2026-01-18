// Simple in-memory rate limiter
// In production, use Redis for distributed rate limiting

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitOptions {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions = { windowMs: 10000, maxRequests: 1 }
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs
    });
    return { allowed: true };
  }

  if (entry.count >= options.maxRequests) {
    // Rate limited
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000)
    };
  }

  // Increment count
  entry.count++;
  return { allowed: true };
}

// Create rate limit key from IP and optional player key
export function createRateLimitKey(ip: string, playerKey?: string): string {
  const parts = ['submit', ip];
  if (playerKey) {
    parts.push(playerKey);
  }
  return parts.join(':');
}
