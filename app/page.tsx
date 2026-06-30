"use client";
import { useState, useEffect, useCallback } from "react";
import { Character, Message } from "./types";
import Sidebar from "./components/Sidebar";
import ChatView from "./components/ChatView";
import CharacterForm from "./components/CharacterForm";
import GenerateModal from "./components/GenerateModal";
import { dbGetCharacters, dbPutCharacters, dbDeleteCharacter, dbGetMessages, dbPutMessages, dbDeleteMessages } from "./lib/db";

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function Home() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Character | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);

  useEffect(() => {
    dbGetCharacters().then(chars => {
      setCharacters(chars);
      if (chars.length > 0) setActiveId(chars[0].id);
    });
  }, []);

  useEffect(() => {
    if (activeId) {
      dbGetMessages(activeId).then(setMessages);
    } else {
      setMessages([]);
    }
  }, [activeId]);

  const activeChar = characters.find(c => c.id === activeId) ?? null;

  const handleGenerateAdd = useCallback(async (generated: Omit<Character, "id" | "createdAt">[]) => {
    const newChars = generated.map(data => ({ ...data, id: genId(), createdAt: Date.now() }));
    const updated = [...characters, ...newChars];
    setCharacters(updated);
    await dbPutCharacters(updated);
    if (newChars.length > 0) setActiveId(newChars[newChars.length - 1].id);
    setShowGenerate(false);
    setSidebarOpen(false);
  }, [characters]);

  const handleCreate = useCallback(async (data: Omit<Character, "id" | "createdAt">) => {
    const newChar: Character = { ...data, id: genId(), createdAt: Date.now() };
    const updated = [...characters, newChar];
    setCharacters(updated);
    await dbPutCharacters(updated);
    setActiveId(newChar.id);
    setShowForm(false);
    setEditTarget(null);
  }, [characters]);

  const handleEdit = useCallback(async (data: Omit<Character, "id" | "createdAt">) => {
    if (!editTarget) return;
    const updated = characters.map(c => c.id === editTarget.id ? { ...c, ...data } : c);
    setCharacters(updated);
    await dbPutCharacters(updated);
    setShowForm(false);
    setEditTarget(null);
  }, [characters, editTarget]);

  const handleDelete = useCallback(async () => {
    if (!activeId) return;
    await dbDeleteMessages(activeId);
    await dbDeleteCharacter(activeId);
    const updated = characters.filter(c => c.id !== activeId);
    setCharacters(updated);
    setActiveId(updated[0]?.id ?? null);
  }, [activeId, characters]);

  const handleClearChat = useCallback(async () => {
    if (activeId) await dbDeleteMessages(activeId);
    setMessages([]);
  }, [activeId]);

  const handleContinue = useCallback(async () => {
    if (!activeChar || loading) return;
    setLoading(true);
    try {
      const nudged = [...messages, { id: "nudge", role: "user" as const, content: "...", timestamp: Date.now() }];
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nudged, character: activeChar }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const aiMsg: Message = { id: genId(), role: "model", content: data.reply, timestamp: Date.now() };
      setMessages(prev => {
        const next = [...prev, aiMsg];
        dbPutMessages(activeChar.id, next);
        return next;
      });
    } catch (err) {
      const errMsg: Message = {
        id: genId(), role: "model",
        content: `⚠️ ${err instanceof Error ? err.message : "Something went wrong. Please try again."}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [activeChar, messages, loading]);

  const handleSend = useCallback(async (text: string) => {
    if (!activeChar) return;
    const userMsg: Message = { id: genId(), role: "user", content: text, timestamp: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    dbPutMessages(activeChar.id, updated);
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
      const withReply = [...updated, aiMsg];
      setMessages(withReply);
      dbPutMessages(activeChar.id, withReply);
    } catch (err) {
      const errMsg: Message = {
        id: genId(), role: "model",
        content: `⚠️ ${err instanceof Error ? err.message : "Something went wrong. Please try again."}`,
        timestamp: Date.now(),
      };
      setMessages([...updated, errMsg]);
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
          onGenerate={() => { setShowGenerate(true); setSidebarOpen(false); }}
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
            onContinue={handleContinue}
            onEdit={() => { setEditTarget(activeChar); setShowForm(true); }}
            onDelete={handleDelete}
            onClearChat={handleClearChat}
            onOpenSidebar={() => setSidebarOpen(true)}
            loading={loading}
          />
        ) : (
          <div
            className="h-full flex flex-col items-center justify-center text-center px-8"
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

      {showGenerate && (
        <GenerateModal
          onAdd={handleGenerateAdd}
          onClose={() => setShowGenerate(false)}
        />
      )}
    </div>
  );
}
