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

// Merge server chars with local: server is source of truth for metadata,
// but local may have base64 images that the server strips — restore them.
function mergeChars(server: Character[], local: Character[]): Character[] {
  const localMap = new Map(local.map(c => [c.id, c]));
  return server.map(sc => {
    const lc = localMap.get(sc.id);
    if (!lc) return sc;
    return {
      ...sc,
      avatar: sc.avatar === "🌸" && lc.avatar.startsWith("data:") ? lc.avatar : sc.avatar,
      chatBg: sc.chatBg.startsWith("linear-gradient") && lc.chatBg.startsWith("data:") ? lc.chatBg : sc.chatBg,
    };
  });
}

async function serverGetChars(): Promise<Character[] | null> {
  try {
    const res = await fetch("/api/sync/chars");
    const data = await res.json() as { chars: Character[] | null };
    return data.chars;
  } catch { return null; }
}

async function serverPutChars(chars: Character[]): Promise<void> {
  try {
    await fetch("/api/sync/chars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chars }),
    });
  } catch { /* best-effort */ }
}

async function serverGetMsgs(id: string): Promise<Message[] | null> {
  try {
    const res = await fetch(`/api/sync/msgs/${id}`);
    const data = await res.json() as { msgs: Message[] | null };
    return data.msgs;
  } catch { return null; }
}

async function serverPutMsgs(id: string, msgs: Message[]): Promise<void> {
  try {
    await fetch(`/api/sync/msgs/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgs }),
    });
  } catch { /* best-effort */ }
}

async function serverDelMsgs(id: string): Promise<void> {
  try {
    await fetch(`/api/sync/msgs/${id}`, { method: "DELETE" });
  } catch { /* best-effort */ }
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
    (async () => {
      const local = await dbGetCharacters();
      // Show local immediately so UI isn't blank
      if (local.length > 0) {
        setCharacters(local);
        setActiveId(local[0].id);
      }
      // Then pull server and merge
      const server = await serverGetChars();
      if (server && server.length > 0) {
        const merged = mergeChars(server, local);
        setCharacters(merged);
        await dbPutCharacters(merged);
        if (!local.length) setActiveId(merged[0].id);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    (async () => {
      const local = await dbGetMessages(activeId);
      if (local.length > 0) setMessages(local);
      const server = await serverGetMsgs(activeId);
      if (server && server.length > local.length) {
        setMessages(server);
        await dbPutMessages(activeId, server);
      }
    })();
  }, [activeId]);

  const activeChar = characters.find(c => c.id === activeId) ?? null;

  const saveChars = useCallback(async (updated: Character[]) => {
    setCharacters(updated);
    await dbPutCharacters(updated);
    serverPutChars(updated); // fire-and-forget
  }, []);

  const saveMsgs = useCallback(async (charId: string, msgs: Message[]) => {
    await dbPutMessages(charId, msgs);
    serverPutMsgs(charId, msgs); // fire-and-forget
  }, []);

  const handleGenerateAdd = useCallback(async (generated: Omit<Character, "id" | "createdAt">[]) => {
    const newChars = generated.map(data => ({ ...data, id: genId(), createdAt: Date.now() }));
    const updated = [...characters, ...newChars];
    await saveChars(updated);
    if (newChars.length > 0) setActiveId(newChars[newChars.length - 1].id);
    setShowGenerate(false);
    setSidebarOpen(false);
  }, [characters, saveChars]);

  const handleCreate = useCallback(async (data: Omit<Character, "id" | "createdAt">) => {
    const newChar: Character = { ...data, id: genId(), createdAt: Date.now() };
    const updated = [...characters, newChar];
    await saveChars(updated);
    setActiveId(newChar.id);
    setShowForm(false);
    setEditTarget(null);
  }, [characters, saveChars]);

  const handleEdit = useCallback(async (data: Omit<Character, "id" | "createdAt">) => {
    if (!editTarget) return;
    const updated = characters.map(c => c.id === editTarget.id ? { ...c, ...data } : c);
    await saveChars(updated);
    setShowForm(false);
    setEditTarget(null);
  }, [characters, editTarget, saveChars]);

  const handleDelete = useCallback(async () => {
    if (!activeId) return;
    await dbDeleteMessages(activeId);
    serverDelMsgs(activeId);
    await dbDeleteCharacter(activeId);
    const updated = characters.filter(c => c.id !== activeId);
    await saveChars(updated);
    setActiveId(updated[0]?.id ?? null);
  }, [activeId, characters, saveChars]);

  const handleClearChat = useCallback(async () => {
    if (!activeId) return;
    await dbDeleteMessages(activeId);
    serverDelMsgs(activeId);
    setMessages([]);
  }, [activeId]);

  const handleDeleteMessage = useCallback(async (msgId: string) => {
    if (!activeChar) return;
    setMessages(prev => {
      const next = prev.filter(m => m.id !== msgId);
      saveMsgs(activeChar.id, next);
      return next;
    });
  }, [activeChar, saveMsgs]);

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
        saveMsgs(activeChar.id, next);
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
  }, [activeChar, messages, loading, saveMsgs]);

  const handleSend = useCallback(async (text: string) => {
    if (!activeChar) return;
    const userMsg: Message = { id: genId(), role: "user", content: text, timestamp: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    await saveMsgs(activeChar.id, updated);
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
      await saveMsgs(activeChar.id, withReply);
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
  }, [activeChar, messages, saveMsgs]);

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
            onDeleteMessage={handleDeleteMessage}
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
