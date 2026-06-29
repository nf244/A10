"use client";
import { Character } from "../types";

interface Props {
  characters: Character[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export default function Sidebar({ characters, activeId, onSelect, onCreate }: Props) {
  return (
    <aside className="w-72 flex-shrink-0 bg-[#0e0e18] border-r border-white/8 flex flex-col h-full">
      <div className="px-5 py-4 border-b border-white/8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-white">MuseChat</h1>
            <p className="text-xs text-white/30 mt-0.5">Your AI companion</p>
          </div>
          <button
            onClick={onCreate}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-600 to-purple-700 flex items-center justify-center text-white text-lg hover:opacity-90 transition-opacity shadow-lg shadow-pink-900/30"
            title="New character"
          >+</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {characters.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-3xl mb-3">✨</p>
            <p className="text-sm text-white/40">No characters yet</p>
            <p className="text-xs text-white/25 mt-1">Create your first companion</p>
          </div>
        )}
        {characters.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5 ${activeId === c.id ? "bg-white/8 border-r-2 border-pink-500" : ""}`}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 overflow-hidden bg-white/5">
              {c.avatar.startsWith("http") ? (
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

      <div className="px-5 py-3 border-t border-white/8">
        <p className="text-xs text-white/20 text-center">All data stays on your device</p>
      </div>
    </aside>
  );
}
