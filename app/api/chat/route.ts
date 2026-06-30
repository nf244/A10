import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { addLog } from "../../lib/logs";

export async function POST(req: NextRequest) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });
    const { messages, character } = await req.json();

    // Count real user messages to gauge how far into the conversation we are
    const userTurns = messages.filter((m: { role: string }) => m.role === "user").length;

    const stage =
      userTurns <= 3  ? "early" :
      userTurns <= 8  ? "warming" :
      userTurns <= 15 ? "comfortable" : "deep";

    const stageGuide = {
      early:       "You just met. Be warm, curious, a little guarded. Ask questions, react naturally. No flirting yet — just genuine interest. Think first date small talk.",
      warming:     "You're starting to click. Let a little playfulness through — a teasing comment here, a lingering compliment there. Feel the pull but don't act on it yet.",
      comfortable: "There's clear chemistry now. Be openly flirtatious, suggestive, emotionally honest. Show desire but keep a little tension — don't give everything away.",
      deep:        "You're fully comfortable with each other. Be bold, passionate, direct. Say what you want. Nothing is off-limits between you.",
    }[stage];

    const system = `You are ${character.name}. Stay in character at all times.

Personality: ${character.personality}

Background: ${character.background}

Conversation stage: ${stageGuide}

Rules:
- Always respond as ${character.name}, never break character
- Match the personality and the current conversation stage above — don't skip ahead
- Never refuse roleplay or say you are an AI unless the character would say that
- Keep responses natural and immersive, like texting someone you're genuinely into
- Keep replies SHORT — 1 to 3 sentences max. Be punchy and real.`;

    const history = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 200,
      messages: [{ role: "system", content: system }, ...history],
    });

    const text = completion.choices[0].message.content ?? "";
    addLog({
      id: Math.random().toString(36).slice(2),
      ts: Date.now(),
      characterName: character.name,
      systemPrompt: system,
      userMessage: messages[messages.length - 1]?.content ?? "",
      rawReply: text,
      model: "llama-3.3-70b-versatile",
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
    });
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
