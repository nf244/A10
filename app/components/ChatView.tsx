"use client";
import { useState, useRef, useEffect } from "react";
import { Character, Message } from "../types";

interface Props {
  character: Character;
  messages: Message[];
  onSend: (text: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClearChat: () => void;
  loading: boolean;
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 fade-up">
      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm flex-shrink-0">
        ···
      </div>
      <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
        <span className="typing-dot w-2 h-2 rounded-full bg-white/60 block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-white/60 block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-white/60 block" />
      </div>
    </div>
  );
}

export default function ChatView({ character, messages, onSend, onEdit, onDelete, onClearChat, loading }: Props) {
  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    onSend(text);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isImageBg = character.chatBg.startsWith("http");
  const bgStyle = isImageBg
    ? { backgroundImage: `url(${character.chatBg})` }
    : { background: character.chatBg };

  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute inset-0 chat-bg" style={bgStyle} />
      {isImageBg && <div className="absolute inset-0 bg-black/50" />}

      <header className="relative z-10 flex items-center gap-3 px-5 py-3 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xl overflow-hidden bg-white/10 flex-shrink-0">
          {character.avatar.startsWith("http") ? (
            <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
          ) : character.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{character.name}</p>
          <p className="text-xs text-white/40 truncate">{character.personality.slice(0, 60) || "AI Companion"}</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
          >⋮</button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-44 bg-[#1a1a28] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
              <button onClick={() => { onEdit(); setMenuOpen(false); }} className="w-full px-4 py-2.5 text-sm text-left text-white/80 hover:bg-white/10 hover:text-white transition-all">
                ✏️ Edit character
              </button>
              <button onClick={() => { onClearChat(); setMenuOpen(false); }} className="w-full px-4 py-2.5 text-sm text-left text-white/80 hover:bg-white/10 hover:text-white transition-all">
                🗑️ Clear chat
              </button>
              <button onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full px-4 py-2.5 text-sm text-left text-red-400 hover:bg-red-900/20 transition-all">
                ✕ Delete character
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto scrollbar-thin px-5 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 fade-up">
            <div className="text-4xl mb-3">
              {character.avatar.startsWith("http") ? "💬" : character.avatar}
            </div>
            <p className="text-white font-medium">{character.name}</p>
            <p className="text-white/40 text-sm mt-1">Say hello to start the conversation</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex items-end gap-2 fade-up ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {m.role === "model" && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 overflow-hidden bg-white/10">
                {character.avatar.startsWith("http")
                  ? <img src={character.avatar} alt="" className="w-full h-full object-cover" />
                  : character.avatar}
              </div>
            )}
            <div
              className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                m.role === "user"
                  ? "bg-gradient-to-br from-pink-600 to-purple-700 text-white rounded-br-sm"
                  : "bg-black/40 backdrop-blur-md text-white/90 border border-white/10 rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <div className="relative z-10 px-4 py-3 border-t border-white/10 bg-black/30 backdrop-blur-md">
        <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 focus-within:border-pink-500/40 transition-colors">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Message ${character.name}…`}
            className="flex-1 bg-transparent text-white placeholder-white/30 text-sm resize-none focus:outline-none max-h-32 scrollbar-thin py-1"
            style={{ lineHeight: "1.5" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-600 to-purple-700 flex items-center justify-center text-white text-sm hover:opacity-90 disabled:opacity-30 transition-all flex-shrink-0 mb-0.5"
          >↑</button>
        </div>
        <p className="text-xs text-white/15 text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
