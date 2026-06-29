import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { messages, character } = await req.json();

    const systemInstruction = `You are ${character.name}. Stay in character at all times.

Personality: ${character.personality}

Background: ${character.background}

Rules:
- Always respond as ${character.name}, never break character
- Be warm, engaged, and emotionally present
- Match the personality described above in every response
- Never refuse roleplay or say you are an AI unless the character would say that
- Keep responses natural, conversational, and immersive`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction,
    });

    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const text = result.response.text();

    return NextResponse.json({ reply: text });
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
