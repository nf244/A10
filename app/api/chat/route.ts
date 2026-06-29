import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
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
    })) as Anthropic.MessageParam[];

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system,
      messages: history,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ reply: text });

  } catch (err: unknown) {
    console.error(err);
    const raw = err instanceof Error ? err.message : String(err);

    let friendly = raw;
    if (raw.includes("429") || raw.includes("rate_limit") || raw.includes("overloaded")) {
      friendly = "Rate limit hit — wait a moment and try again.";
    } else if (raw.includes("401") || raw.includes("authentication") || raw.includes("invalid x-api-key")) {
      friendly = "Invalid API key. Set a valid ANTHROPIC_API_KEY (starts with sk-ant-…) in your Vercel project settings at console.anthropic.com.";
    } else if (raw.includes("credit") || raw.includes("billing")) {
      friendly = "No API credits remaining. Add billing at console.anthropic.com.";
    }

    const status = raw.includes("429") ? 429 : raw.includes("401") ? 401 : 500;
    return NextResponse.json({ error: friendly }, { status });
  }
}
