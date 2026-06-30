import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvGetMany, kvSet, kvSetLarge, kvDel, kvDelMany, isConfigured } from "../../../lib/redis";
import type { Character } from "../../../types";

const INDEX_KEY = "musechat:chars";
const charKey = (id: string) => `musechat:char:${id}`;

export async function GET() {
  if (!isConfigured()) return NextResponse.json({ chars: null });
  try {
    const ids = await kvGet<string[]>(INDEX_KEY);
    if (!ids || ids.length === 0) return NextResponse.json({ chars: null });
    const chars = await kvGetMany<Character>(ids.map(charKey));
    const valid = chars.filter((c): c is Character => c !== null);
    return NextResponse.json({ chars: valid.length > 0 ? valid : null });
  } catch {
    return NextResponse.json({ chars: null });
  }
}

export async function POST(req: NextRequest) {
  if (!isConfigured()) return NextResponse.json({ ok: false });
  try {
    const { chars } = await req.json() as { chars: Character[] };
    const newIds = chars.map(c => c.id);
    const newIdSet = new Set(newIds);

    // Clean up deleted characters
    const existingIds = await kvGet<string[]>(INDEX_KEY) ?? [];
    const deletedIds = existingIds.filter(id => !newIdSet.has(id));
    if (deletedIds.length > 0) await kvDelMany(deletedIds.map(charKey));

    // Save index
    await kvSet(INDEX_KEY, newIds);

    // Save each character individually using a direct POST (avoids pipeline
    // body-size limits when chatBg or avatar contains a large base64 image)
    await Promise.all(chars.map(c => kvSetLarge(charKey(c.id), c)));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function DELETE() {
  if (!isConfigured()) return NextResponse.json({ ok: false });
  try {
    const ids = await kvGet<string[]>(INDEX_KEY) ?? [];
    await kvDelMany(ids.map(charKey));
    await kvDel(INDEX_KEY);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
