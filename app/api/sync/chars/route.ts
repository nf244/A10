import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet, isConfigured } from "../../../lib/redis";
import type { Character } from "../../../types";

const KEY = "musechat:chars";

// Strip large data: URLs before storing — only keep http(s) URLs and emojis
function stripImages(chars: Character[]): Character[] {
  return chars.map(c => ({
    ...c,
    avatar: c.avatar.startsWith("data:") ? "🌸" : c.avatar,
    chatBg: c.chatBg.startsWith("data:") ? "linear-gradient(135deg,#1a1a2e,#16213e)" : c.chatBg,
  }));
}

export async function GET() {
  if (!isConfigured()) return NextResponse.json({ chars: null });
  try {
    const chars = await kvGet<Character[]>(KEY);
    return NextResponse.json({ chars });
  } catch {
    return NextResponse.json({ chars: null });
  }
}

export async function POST(req: NextRequest) {
  if (!isConfigured()) return NextResponse.json({ ok: false });
  try {
    const { chars } = await req.json() as { chars: Character[] };
    await kvSet(KEY, stripImages(chars));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
