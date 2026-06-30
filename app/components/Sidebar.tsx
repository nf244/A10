"use client";
import { Character } from "../types";

interface Props {
  characters: Character[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onGenerate: () => void;
  onClose: () => void;
}

export default function Sidebar({ characters, activeId, onSelect, onCreate, onGenerate, onClose }: Props) {
  return (
    <aside className="w-72 flex-shrink-0 bg-[#0e0e18] border-r border-white/8 flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/8 pt-safe">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-white">MuseChat</h1>
            <p className="text-xs text-white/30 mt-0.5">Your AI companion</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCreate}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-600 to-purple-700 flex items-center justify-center text-white text-xl hover:opacity-90 transition-opacity shadow-lg shadow-pink-900/30"
              title="New character"
            >+</button>
            {/* Close button — only visible on mobile */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors md:hidden"
              title="Close"
            >✕</button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {characters.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-3xl mb-3">✨</p>
            <p className="text-sm text-white/40">No characters yet</p>
            <p className="text-xs text-white/25 mt-1">Tap + to create your first companion</p>
          </div>
        )}
        {characters.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all active:bg-white/10 hover:bg-white/5 ${activeId === c.id ? "bg-white/8 border-r-2 border-pink-500" : ""}`}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0 overflow-hidden bg-white/5">
              {c.avatar.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
              ) : c.avatar}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{c.name}</p>
              <p className="text-xs text-white/35 truncate">{c.personality.slice(0, 40) || "No personality set"}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-white/8 pb-safe space-y-2">
        <button
          onClick={onGenerate}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 hover:text-white active:bg-white/15 transition-all"
        >
          <span>✨</span> Generate characters
        </button>
        <p className="text-xs text-white/20 text-center">All data stays on your device</p>
      </div>
    </aside>
  );
}
