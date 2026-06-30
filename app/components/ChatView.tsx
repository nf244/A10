"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Character, Message } from "../types";

interface Props {
  character: Character;
  messages: Message[];
  onSend: (text: string) => void;
  onContinue: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClearChat: () => void;
  onDeleteMessage: (id: string) => void;
  onOpenSidebar: () => void;
  loading: boolean;
}

function TypingIndicator({ avatar }: { avatar: string }) {
  return (
    <div className="flex items-end gap-2 fade-up">
      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
        {(avatar.startsWith("http") || avatar.startsWith("data:"))
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={avatar} alt="" className="w-full h-full object-cover" />
          : avatar}
      </div>
      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
        <span className="typing-dot w-2 h-2 rounded-full bg-white/60 block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-white/60 block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-white/60 block" />
      </div>
    </div>
  );
}

function MessageBubble({
  m,
  avatar,
  onDelete,
}: {
  m: Message;
  avatar: string;
  onDelete: () => void;
}) {
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const isUser = m.role === "user";
  const THRESHOLD = 72;

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    setSwiping(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!swiping) return;
    const dx = e.touches[0].clientX - startX.current;
    // User bubbles swipe left, model bubbles swipe right — both reveal delete
    const clamped = isUser
      ? Math.min(0, Math.max(-THRESHOLD, dx))
      : Math.max(0, Math.min(THRESHOLD, dx));
    setSwipeX(clamped);
  }

  function onTouchEnd() {
    setSwiping(false);
    const abs = Math.abs(swipeX);
    if (abs >= THRESHOLD - 4) {
      onDelete();
    }
    setSwipeX(0);
  }

  const deleteOpacity = Math.min(1, Math.abs(swipeX) / THRESHOLD);

  return (
    <div className="relative flex items-end gap-2 fade-up" style={{ flexDirection: isUser ? "row-reverse" : "row" }}>
      {/* Delete hint revealed by swipe */}
      <div
        className="absolute flex items-center justify-center w-8 h-8 rounded-full bg-red-600/80 text-white text-xs pointer-events-none transition-opacity"
        style={{
          opacity: deleteOpacity,
          [isUser ? "right" : "left"]: "0",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        ✕
      </div>

      {m.role === "model" && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 overflow-hidden bg-white/10 mb-0.5">
          {(avatar.startsWith("http") || avatar.startsWith("data:"))
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={avatar} alt="" className="w-full h-full object-cover" />
            : avatar}
        </div>
      )}

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${swipeX}px)`, transition: swiping ? "none" : "transform 0.2s ease" }}
        className={`max-w-[80%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words select-none ${
          isUser
            ? "bg-gradient-to-br from-pink-600 to-purple-700 text-white rounded-br-sm"
            : "bg-black/40 backdrop-blur-md text-white/90 border border-white/10 rounded-bl-sm"
        }`}
      >
        {m.content}
      </div>
    </div>
  );
}

export default function ChatView({ character, messages, onSend, onContinue, onEdit, onDelete, onClearChat, onDeleteMessage, onOpenSidebar, loading }: Props) {
  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bgView, setBgView] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Swipe-up/down to toggle bg view
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

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

  function handleContainerTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  }

  function handleContainerTouchEnd(e: React.TouchEvent) {
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    const dx = Math.abs(touchStartX.current - e.changedTouches[0].clientX);
    // Vertical swipe of >60px with mostly vertical direction
    if (Math.abs(dy) > 60 && dx < 40) {
      if (dy > 0) setBgView(true);   // swipe up = show bg
      else setBgView(false);          // swipe down = show chat
    }
  }

  const isImageBg = character.chatBg.startsWith("http") || character.chatBg.startsWith("data:");

  // Compute exact pixel background-size so zoom changes how much image is visible
  const [bgSize, setBgSize] = useState("cover");
  const computeBgSize = useCallback(() => {
    const zoom = character.chatBgZoom ?? 1;
    if (!isImageBg || zoom === 1) { setBgSize("cover"); return; }
    const img = new Image();
    img.onload = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const coverScale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      setBgSize(`${Math.round(img.naturalWidth * coverScale * zoom)}px ${Math.round(img.naturalHeight * coverScale * zoom)}px`);
    };
    img.src = character.chatBg;
  }, [isImageBg, character.chatBg, character.chatBgZoom]);

  useEffect(() => { computeBgSize(); }, [computeBgSize]);

  const bgStyle = isImageBg
    ? { backgroundImage: `url(${character.chatBg})`, backgroundSize: bgSize, backgroundPosition: character.chatBgPos ?? "center", backgroundRepeat: "no-repeat" }
    : { background: character.chatBg };
  const avatarDisplay = character.avatar === "@bg" ? character.chatBg : character.avatar;

  return (
    <div
      className="flex flex-col relative"
      style={{ height: "100dvh" }}
      onTouchStart={handleContainerTouchStart}
      onTouchEnd={handleContainerTouchEnd}
    >
      {/* Background */}
      <div className="absolute inset-0 chat-bg" style={bgStyle} />
      {isImageBg && <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${bgView ? "opacity-0" : "opacity-100"}`} />}

      {/* Full-screen bg view overlay */}
      {bgView && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-end pb-12"
          onClick={() => setBgView(false)}
        >
          <div className="text-white/50 text-sm flex flex-col items-center gap-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="19 15 12 22 5 15"/>
            </svg>
            swipe down to close
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`relative z-20 flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-black/30 backdrop-blur-md pt-safe flex-shrink-0 transition-opacity duration-300 ${bgView ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        {/* Hamburger — only on mobile */}
        <button
          onClick={onOpenSidebar}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white active:bg-white/10 transition-all flex-shrink-0 md:hidden"
        >☰</button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xl overflow-hidden bg-white/10 flex-shrink-0">
          {(avatarDisplay.startsWith("http") || avatarDisplay.startsWith("data:")) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarDisplay} alt={character.name} className="w-full h-full object-cover" />
          ) : avatarDisplay}
        </div>

        {/* Name + personality */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">{character.name}</p>
          <p className="text-xs text-white/40 truncate leading-tight">{character.personality.slice(0, 50) || "AI Companion"}</p>
        </div>

        {/* Menu */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-10 h-10 rounded-full hover:bg-white/10 active:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all text-xl"
          >⋮</button>
          {menuOpen && (
            <div className="absolute right-0 top-12 w-52 bg-[#1a1a28] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
              {confirmDelete ? (
                <div className="px-4 py-3.5 space-y-2">
                  <p className="text-xs text-white/60">Delete {character.name}?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onDelete(); setMenuOpen(false); setConfirmDelete(false); }}
                      className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-500 transition-colors"
                    >Delete</button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-1.5 rounded-lg bg-white/10 text-white/60 text-xs hover:bg-white/20 transition-colors"
                    >Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <button onClick={() => { onEdit(); setMenuOpen(false); }} className="w-full px-4 py-3.5 text-sm text-left text-white/80 hover:bg-white/10 active:bg-white/10 hover:text-white transition-all">
                    ✏️ Edit character
                  </button>
                  <button onClick={() => { onClearChat(); setMenuOpen(false); }} className="w-full px-4 py-3.5 text-sm text-left text-white/80 hover:bg-white/10 active:bg-white/10 hover:text-white transition-all">
                    🗑️ Clear chat
                  </button>
                  <div className="border-t border-white/10" />
                  <button onClick={() => setConfirmDelete(true)} className="w-full px-4 py-3.5 text-sm text-left text-red-400 hover:bg-red-900/20 active:bg-red-900/20 transition-all">
                    ✕ Delete character
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className={`relative z-10 flex-1 overflow-y-auto scrollbar-thin px-4 py-5 space-y-4 min-h-0 transition-opacity duration-300 ${bgView ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        {messages.length === 0 && (
          <div className="text-center py-16 fade-up">
            <div className="text-5xl mb-4 w-16 h-16 mx-auto rounded-full overflow-hidden flex items-center justify-center bg-white/10">
              {(avatarDisplay.startsWith("http") || avatarDisplay.startsWith("data:"))
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={avatarDisplay} alt="" className="w-full h-full object-cover" />
                : avatarDisplay}
            </div>
            <p className="text-white font-semibold text-base">{character.name}</p>
            <p className="text-white/40 text-sm mt-1">Say hello to start the conversation</p>
          </div>
        )}
        {messages.map(m => (
          <MessageBubble
            key={m.id}
            m={m}
            avatar={avatarDisplay}
            onDelete={() => onDeleteMessage(m.id)}
          />
        ))}
        {loading && <TypingIndicator avatar={avatarDisplay} />}
        <div ref={bottomRef} />
      </div>

      {/* Continue button */}
      {messages.length > 0 && !loading && !bgView && (
        <div className="relative z-10 flex justify-center pb-1">
          <button
            onClick={onContinue}
            className="px-4 py-1.5 rounded-full bg-white/8 border border-white/15 text-white/50 text-xs hover:bg-white/15 hover:text-white/80 active:scale-95 transition-all"
          >
            ✦ Continue
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className={`relative z-10 px-3 pt-2 pb-2 border-t border-white/10 bg-black/30 backdrop-blur-md flex-shrink-0 pb-safe transition-opacity duration-300 ${bgView ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 focus-within:border-pink-500/40 transition-colors">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKey}
            placeholder={`Message ${character.name}…`}
            className="flex-1 bg-transparent text-white placeholder-white/30 resize-none focus:outline-none scrollbar-thin py-1"
            style={{ lineHeight: "1.5", fontSize: "16px", maxHeight: "120px", overflow: "auto" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-600 to-purple-700 flex items-center justify-center text-white hover:opacity-90 active:opacity-80 disabled:opacity-30 transition-all flex-shrink-0 mb-0.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
        </div>
        <p className="text-xs text-white/15 text-center mt-1 hidden sm:block">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
