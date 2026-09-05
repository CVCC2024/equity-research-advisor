import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const TTL = {
  QUOTE: 5 * 60,           // 5 minutes
  FUNDAMENTALS: 24 * 3600, // 24 hours
  FILINGS: 7 * 24 * 3600,  // 7 days
  MACRO: 4 * 3600,          // 4 hours
  INDUSTRY: 4 * 3600,       // 4 hours
  REGULATORY: 24 * 3600,    // 24 hours
  SENTIMENT: 2 * 3600,      // 2 hours
  REPORT: 24 * 3600,        // 24 hours
  BREAKING: 72 * 3600,      // 72 hours
} as const;

function key(symbol: string, type: string): string {
  return `ticker:${symbol.toUpperCase()}:${type}`;
}

export async function getReport(symbol: string): Promise<string | null> {
  return redis.get<string>(key(symbol, 'report'));
}

export async function setReport(symbol: string, markdown: string): Promise<void> {
  await redis.set(key(symbol, 'report'), markdown, { ex: TTL.REPORT });
}

export async function getMakerOutput(symbol: string, maker: 'fundamentals' | 'macro' | 'industry' | 'regulatory'): Promise<unknown | null> {
  return redis.get(key(symbol, maker));
}

export async function setMakerOutput(
  symbol: string,
  maker: 'fundamentals' | 'macro' | 'industry' | 'regulatory',
  data: unknown
): Promise<void> {
  const ttlMap = {
    fundamentals: TTL.FUNDAMENTALS,
    macro: TTL.MACRO,
    industry: TTL.INDUSTRY,
    regulatory: TTL.REGULATORY,
  };
  await redis.set(key(symbol, maker), JSON.stringify(data), { ex: ttlMap[maker] });
}

export async function getLastSessionId(symbol: string): Promise<string | null> {
  return redis.get<string>(key(symbol, 'last_session'));
}

export async function setLastSessionId(symbol: string, sessionId: string): Promise<void> {
  await redis.set(key(symbol, 'last_session'), sessionId);
}

export async function getTickerProfile(symbol: string): Promise<unknown | null> {
  return redis.get(key(symbol, 'profile'));
}

export async function setTickerProfile(symbol: string, profile: unknown): Promise<void> {
  await redis.set(key(symbol, 'profile'), JSON.stringify(profile), { ex: TTL.FUNDAMENTALS });
}

export async function setBreakingClaim(claimId: string, data: unknown): Promise<void> {
  await redis.set(`breaking:${claimId}`, JSON.stringify(data), { ex: TTL.BREAKING });
}

export async function incrementRateLimit(apiName: string): Promise<number> {
  const k = `ratelimit:${apiName}:count`;
  const count = await redis.incr(k);
  if (count === 1) {
    await redis.expire(k, 86400);
  }
  return count;
}

export { redis };
