/**
 * In-memory sliding-window rate limiter. Per server instance — on serverless
 * platforms each instance keeps its own window, which is fine as abuse
 * protection; use a shared store (Redis/Upstash) for strict global limits.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    private limit: number,
    private windowMs = 60 * 60 * 1000,
  ) {}

  /** Returns the seconds to wait, or 0 when the request is allowed. */
  take(key: string, now = Date.now()): number {
    if (this.limit <= 0) return 0;
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (list.length >= this.limit) {
      this.hits.set(key, list);
      return Math.ceil((this.windowMs - (now - list[0])) / 1000);
    }
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 10_000) {
      for (const [k, v] of this.hits) if (!v.some((t) => now - t < this.windowMs)) this.hits.delete(k);
    }
    return 0;
  }
}
