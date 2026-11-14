import { getEnv } from "./env";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  if (memory.size > 5000) {
    for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
  }
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  entry.count += 1;
  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
  };
}

/**
 * Fixed-window limiter. Pakai Upstash Redis jika dikonfigurasi (konsisten antar instance);
 * jika Redis error, jatuh ke memori per-instance (tidak fail-open).
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const env = getEnv();
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return memoryLimit(key, limit, windowSec);

  try {
    const k = `rl:${key}`;
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", k],
        ["EXPIRE", k, windowSec, "NX"],
        ["TTL", k],
      ]),
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error(`upstash ${res.status}`);
    const data = (await res.json()) as Array<{ result: number }>;
    const count = data[0]?.result ?? 1;
    const ttl = Math.max(0, data[2]?.result ?? windowSec);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfterSec: ttl };
  } catch {
    return memoryLimit(key, limit, windowSec);
  }
}
