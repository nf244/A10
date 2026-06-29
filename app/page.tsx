"use client";
import { useState, useEffect, useCallback } from "react";
import { Character, Message } from "./types";
import Sidebar from "./components/Sidebar";
import ChatView from "./components/ChatView";
import CharacterForm from "./components/CharacterForm";

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadCharacters(): Character[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("mc_characters") || "[]"); } catch { return []; }
}
function saveCharacters(chars: Character[]) {
  localStorage.setItem("mc_characters", JSON.stringify(chars));
}
function loadMessages(charId: string): Message[] {
  try { return JSON.parse(localStorage.getItem(`mc_msgs_${charId}`) || "[]"); } catch { return []; }
}
function saveMessages(charId: string, msgs: Message[]) {
  localStorage.setItem(`mc_msgs_${charId}`, JSON.stringify(msgs));
}

export default function Home() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Character | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const chars = loadCharacters();
    setCharacters(chars);
    if (chars.length > 0) setActiveId(chars[0].id);
  }, []);

  useEffect(() => {
    if (activeId) setMessages(loadMessages(activeId));
  }, [activeId]);

  const activeChar = characters.find(c => c.id === activeId) ?? null;

  const handleCreate = useCallback((data: Omit<Character, "id" | "createdAt">) => {
    const newChar: Character = { ...data, id: genId(), createdAt: Date.now() };
    const updated = [...characters, newChar];
    setCharacters(updated);
    saveCharacters(updated);
    setActiveId(newChar.id);
    setShowForm(false);
    setEditTarget(null);
  }, [characters]);

  const handleEdit = useCallback((data: Omit<Character, "id" | "createdAt">) => {
    if (!editTarget) return;
    const updated = characters.map(c => c.id === editTarget.id ? { ...c, ...data } : c);
    setCharacters(updated);
    saveCharacters(updated);
    setShowForm(false);
    setEditTarget(null);
  }, [characters, editTarget]);

  const handleDelete = useCallback(() => {
    if (!activeId) return;
    if (!confirm("Delete this character and all chat history?")) return;
    localStorage.removeItem(`mc_msgs_${activeId}`);
    const updated = characters.filter(c => c.id !== activeId);
    setCharacters(updated);
    saveCharacters(updated);
    setActiveId(updated[0]?.id ?? null);
  }, [activeId, characters]);

  const handleClearChat = useCallback(() => {
    if (!activeId) return;
    setMessages([]);
    saveMessages(activeId, []);
  }, [activeId]);

  const handleSend = useCallback(async (text: string) => {
    if (!activeChar) return;
    const userMsg: Message = { id: genId(), role: "user", content: text, timestamp: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    saveMessages(activeChar.id, updated);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, character: activeChar }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const aiMsg: Message = { id: genId(), role: "model", content: data.reply, timestamp: Date.now() };
      const withAi = [...updated, aiMsg];
      setMessages(withAi);
      saveMessages(activeChar.id, withAi);
    } catch (err) {
      const errMsg: Message = {
        id: genId(), role: "model",
        content: `⚠️ ${err instanceof Error ? err.message : "Something went wrong. Please try again."}`,
        timestamp: Date.now(),
      };
      const withErr = [...updated, errMsg];
      setMessages(withErr);
      saveMessages(activeChar.id, withErr);
    } finally {
      setLoading(false);
    }
  }, [activeChar, messages]);

  return (
    <div className="flex h-full" style={{ height: "100dvh" }}>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — overlay on mobile, static column on desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-40 md:static md:z-auto md:flex
        transition-transform duration-250 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <Sidebar
          characters={characters}
          activeId={activeId}
          onSelect={id => { setActiveId(id); setSidebarOpen(false); }}
          onCreate={() => { setEditTarget(null); setShowForm(true); setSidebarOpen(false); }}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content — always full-width on mobile */}
      <main className="flex-1 h-full overflow-hidden min-w-0">
        {activeChar ? (
          <ChatView
            key={activeChar.id}
            character={activeChar}
            messages={messages}
            onSend={handleSend}
            onEdit={() => { setEditTarget(activeChar); setShowForm(true); }}
            onDelete={handleDelete}
            onClearChat={handleClearChat}
            onOpenSidebar={() => setSidebarOpen(true)}
            loading={loading}
          />
        ) : (
          <div
            className="h-full flex flex-col items-center justify-center text-center px-8 relative"
            style={{ background: "linear-gradient(135deg,#0a0a0f,#12081a)" }}
          >
            <button
              className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >☰</button>
            <div className="text-6xl mb-6">💜</div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to MuseChat</h2>
            <p className="text-white/40 max-w-xs mb-8 text-sm">Create your first AI companion and start an unforgettable conversation.</p>
            <button
              onClick={() => { setEditTarget(null); setShowForm(true); }}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-pink-600 to-purple-700 text-white font-medium hover:opacity-90 transition-opacity shadow-lg shadow-pink-900/30"
            >
              + Create a character
            </button>
          </div>
        )}
      </main>

      {showForm && (
        <CharacterForm
          initial={editTarget}
          onSave={editTarget ? handleEdit : handleCreate}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
