type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export class RateLimitError extends Error {
  constructor(message = 'too many requests') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export function consumeRateLimit(input: { key: string; limit: number; windowMs: number }) {
  const now = Date.now();
  const current = buckets.get(input.key);

  if (!current || current.resetAt <= now) {
    buckets.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs
    });
    return;
  }

  if (current.count >= input.limit) {
    throw new RateLimitError();
  }

  current.count += 1;
  buckets.set(input.key, current);
}

export function resetRateLimits() {
  buckets.clear();
}

