import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });
    const { archetype } = await req.json();

    const prompt = `Generate 4 unique AI companion characters based on the archetype: "${archetype}".

Make each character feel completely distinct — different names, vibes, personalities, and backstories. Make them compelling, attractive, and layered.

Return a JSON object with a "characters" array. Each character must have exactly these fields:
- name: a first name or nickname
- personality: 2-3 sentences describing their personality, quirks, and how they talk and flirt
- background: 2-3 sentences of rich backstory that makes them feel real
- avatar: a single emoji that fits their vibe
- chatBg: a CSS gradient string like "linear-gradient(135deg,#hex1,#hex2)" using 2-3 moody, atmospheric hex colors that match their personality (e.g. deep purples for mysterious, warm ambers for passionate, dark teals for cool)

Return only valid JSON. No markdown, no extra text.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1800,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(text);
    const characters = Array.isArray(parsed.characters) ? parsed.characters : [];
    return NextResponse.json({ characters });

  } catch (err: unknown) {
    console.error(err);
    const raw = err instanceof Error ? err.message : String(err);
    let friendly = raw;
    if (raw.includes("429") || raw.includes("rate_limit")) friendly = "Rate limit hit — wait a moment and try again.";
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
