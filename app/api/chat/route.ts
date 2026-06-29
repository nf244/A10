import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });
    const { messages, character } = await req.json();

    const system = `You are ${character.name}. Stay in character at all times.

Personality: ${character.personality}

Background: ${character.background}

Rules:
- Always respond as ${character.name}, never break character
- Be warm, engaged, and emotionally present
- Match the personality described above in every response
- Never refuse roleplay or say you are an AI unless the character would say that
- Keep responses natural, conversational, and immersive`;

    const history = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      messages: [{ role: "system", content: system }, ...history],
    });

    const text = completion.choices[0].message.content ?? "";
    return NextResponse.json({ reply: text });

  } catch (err: unknown) {
    console.error(err);
    const raw = err instanceof Error ? err.message : String(err);

    let friendly = raw;
    if (raw.includes("429") || raw.includes("rate_limit")) {
      friendly = "Rate limit hit — wait a moment and try again.";
    } else if (raw.includes("401") || raw.includes("auth") || raw.includes("api_key")) {
      friendly = "Invalid Groq API key. Check GROQ_API_KEY in your Vercel settings.";
    }

    const status = raw.includes("429") ? 429 : raw.includes("401") ? 401 : 500;
    return NextResponse.json({ error: friendly }, { status });
  }
}
