import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet, kvDel, isConfigured } from "../../../../lib/redis";
import type { Message } from "../../../../types";

function key(id: string) { return `musechat:msgs:${id}`; }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isConfigured()) return NextResponse.json({ msgs: null });
  try {
    const { id } = await params;
    const msgs = await kvGet<Message[]>(key(id));
    return NextResponse.json({ msgs });
  } catch {
    return NextResponse.json({ msgs: null });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isConfigured()) return NextResponse.json({ ok: false });
  try {
    const { id } = await params;
    const { msgs } = await req.json() as { msgs: Message[] };
    await kvSet(key(id), msgs.slice(-500));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isConfigured()) return NextResponse.json({ ok: false });
  try {
    const { id } = await params;
    await kvDel(key(id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
