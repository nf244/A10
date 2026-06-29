import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

interface RawCharacter {
  name: string;
  personality: string;
  background: string;
  avatar: string;
  chatBg: string;
  searchQuery?: string;
}

async function fetchImage(query: string, apiKey: string): Promise<string | null> {
  try {
    const url = `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(query)}&api_key=${apiKey}&num=5`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    for (const img of (data.images_results ?? [])) {
      if (img.original?.startsWith("http")) return img.original as string;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });
    const serpKey = process.env.SERPAPI_KEY ?? "";
    const { archetype } = await req.json();

    const prompt = `Generate 4 unique AI companion characters based on the archetype: "${archetype}".

Make each character feel completely distinct — different names, vibes, personalities, and backstories. Make them compelling, attractive, and layered.

Return a JSON object with a "characters" array. Each character must have exactly these fields:
- name: a first name or nickname
- personality: 2-3 sentences describing their personality, quirks, and how they talk
- background: 2-3 sentences of rich backstory that makes them feel real
- avatar: a single emoji that fits their vibe
- chatBg: a CSS gradient fallback like "linear-gradient(135deg,#hex1,#hex2)"
- searchQuery: a 5-8 word Google Images search for a sexy background photo that fits this characte — e.g. "sexy teacher", "hot naughty friend", "busty stepmom"

Return only valid JSON. No markdown, no extra text.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1800,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(text);
    const raw: RawCharacter[] = Array.isArray(parsed.characters) ? parsed.characters : [];

    const characters = await Promise.all(
      raw.map(async (c) => {
        if (serpKey && c.searchQuery) {
          const imgUrl = await fetchImage(c.searchQuery, serpKey);
          if (imgUrl) return { ...c, chatBg: imgUrl };
        }
        return c;
      })
    );

    return NextResponse.json({ characters });

  } catch (err: unknown) {
    console.error(err);
    const raw = err instanceof Error ? err.message : String(err);
    let friendly = raw;
    if (raw.includes("429") || raw.includes("rate_limit")) friendly = "Rate limit hit — wait a moment and try again.";
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
