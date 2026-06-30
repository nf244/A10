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

async function redisSingle<T>(command: unknown[]): Promise<T> {
  const cfg = getConfig();
  if (!cfg) throw new Error("Upstash not configured");
  const res = await fetch(`${cfg.url}/${(command as string[]).map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${cfg.token}` },
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  const data = await res.json() as { result: T };
  return data.result;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const [result] = await redisCmd<string | null>([["GET", key]]);
  if (!result) return null;
  try { return JSON.parse(result) as T; } catch { return null; }
}

// Pipeline-GET multiple keys in one request (efficient for many small values)
export async function kvGetMany<T>(keys: string[]): Promise<(T | null)[]> {
  if (keys.length === 0) return [];
  const results = await redisCmd<string | null>(keys.map(k => ["GET", k]));
  return results.map(r => {
    if (!r) return null;
    try { return JSON.parse(r) as T; } catch { return null; }
  });
}

// Store a single large value via a direct (non-pipeline) POST to avoid
// pipeline body-size limits when the value contains a base64 image
export async function kvSetLarge(key: string, value: unknown): Promise<void> {
  const cfg = getConfig();
  if (!cfg) throw new Error("Upstash not configured");
  const res = await fetch(`${cfg.url}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["SET", key, JSON.stringify(value)]),
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await redisCmd([["SET", key, JSON.stringify(value)]]);
}

export async function kvDel(key: string): Promise<void> {
  await redisCmd([["DEL", key]]);
}

export async function kvDelMany(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await redisCmd(keys.map(k => ["DEL", k]));
}

export function isConfigured(): boolean {
  return !!getConfig();
}

// Suppress unused-import warning for redisSingle
void redisSingle;
