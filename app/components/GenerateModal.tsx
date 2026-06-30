"use client";
import { useState } from "react";
import { Character } from "../types";

interface Generated {
  name: string;
  personality: string;
  background: string;
  avatar: string;
  chatBg: string;
}

interface Props {
  onAdd: (chars: Omit<Character, "id" | "createdAt">[]) => void;
  onClose: () => void;
}

export default function GenerateModal({ onAdd, onClose }: Props) {
  const [archetype, setArchetype] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Generated[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");

  async function handleGenerate() {
    const q = archetype.trim();
    if (!q || loading) return;
    setLoading(true);
    setResults([]);
    setSelected(new Set());
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archetype: q }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.characters ?? []);
      setSelected(new Set(data.characters.map((_: Generated, i: number) => i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(i: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function handleAdd() {
    const toAdd = results
      .filter((_, i) => selected.has(i))
      .map(c => ({
        name: c.name,
        personality: c.personality,
        background: c.background,
        avatar: c.avatar,
        chatBg: c.chatBg,
      }));
    onAdd(toAdd);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-lg bg-[#12121c] sm:rounded-2xl rounded-t-3xl border border-white/10 shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88dvh]">

        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Title */}
        <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 px-5 py-3.5 border-b border-white/10 flex items-center justify-between flex-shrink-0 sm:rounded-t-2xl">
          <div>
            <h2 className="text-base font-semibold text-white">Generate Characters</h2>
            <p className="text-xs text-white/40 mt-0.5">Describe a type and AI builds 4 unique companions</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4 min-h-0">

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. teacher, villain, childhood friend, assassin…"
              value={archetype}
              onChange={e => setArchetype(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleGenerate()}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 transition-colors"
              style={{ fontSize: "16px" }}
            />
            <button
              onClick={handleGenerate}
              disabled={!archetype.trim() || loading}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-sm font-medium hover:opacity-90 active:opacity-80 disabled:opacity-40 transition-all flex-shrink-0"
            >
              {loading ? "…" : "Generate"}
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="py-12 text-center">
              <div className="text-3xl mb-3 animate-pulse">✨</div>
              <p className="text-white/50 text-sm">Crafting your companions…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm text-center py-4">⚠️ {error}</p>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-white/40 uppercase tracking-wider">
                {selected.size} of {results.length} selected
              </p>
              {results.map((c, i) => {
                const isSelected = selected.has(i);
                const isGradient = !c.chatBg.startsWith("http") && !c.chatBg.startsWith("data:");
                return (
                  <button
                    key={i}
                    onClick={() => toggleSelect(i)}
                    className={`w-full text-left rounded-2xl overflow-hidden border-2 transition-all active:scale-[0.99] ${isSelected ? "border-pink-500" : "border-white/10"}`}
                  >
                    {/* Background strip */}
                    <div
                      className="h-16 w-full relative flex items-center px-4 gap-3"
                      style={isGradient ? { background: c.chatBg } : { backgroundImage: `url(${c.chatBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
                    >
                      <div className="absolute inset-0 bg-black/30" />
                      <div className="relative z-10 w-10 h-10 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-xl flex-shrink-0">
                        {c.avatar}
                      </div>
                      <div className="relative z-10 flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm leading-tight">{c.name}</p>
                        <p className="text-white/60 text-xs truncate leading-tight mt-0.5">{c.personality.slice(0, 55)}…</p>
                      </div>
                      <div className={`relative z-10 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? "bg-pink-500 border-pink-500" : "border-white/30"}`}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                    {/* Detail */}
                    <div className="bg-white/3 px-4 py-3">
                      <p className="text-white/70 text-xs leading-relaxed">{c.background}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="px-5 py-4 border-t border-white/10 flex gap-3 justify-end flex-shrink-0 pb-safe">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selected.size === 0}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-90 active:opacity-80 disabled:opacity-40 transition-all"
            >
              Add {selected.size} character{selected.size !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
