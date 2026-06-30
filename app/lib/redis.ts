// Upstash Redis REST client — server-side only
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel env vars

function getConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function redisCmd<T>(commands: unknown[][]): Promise<T[]> {
  const cfg = getConfig();
  if (!cfg) throw new Error("Upstash not configured");
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  const data = await res.json() as { result: T }[];
  return data.map(r => r.result);
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const [result] = await redisCmd<string | null>([["GET", key]]);
  if (!result) return null;
  try { return JSON.parse(result) as T; } catch { return null; }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await redisCmd([["SET", key, JSON.stringify(value)]]);
}

export async function kvDel(key: string): Promise<void> {
  await redisCmd([["DEL", key]]);
}

export function isConfigured(): boolean {
  return !!getConfig();
}
