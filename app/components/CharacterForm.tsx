"use client";
import { useState } from "react";
import { Character } from "../types";

const GRADIENTS = [
  "linear-gradient(135deg,#1a1a2e,#16213e)",
  "linear-gradient(135deg,#0d0d1a,#1a0a2e)",
  "linear-gradient(135deg,#0a1628,#1a2840)",
  "linear-gradient(135deg,#1a0a0a,#2e1616)",
  "linear-gradient(135deg,#0a1a0a,#162e16)",
  "linear-gradient(135deg,#1a1200,#2e2000)",
  "linear-gradient(135deg,#0f0f0f,#1a1a1a)",
  "linear-gradient(135deg,#1a0a2e,#2e0a1a)",
];

const EMOJIS = ["🌸","💜","🔥","❄️","🌙","⭐","🌹","💫","🦋","🐉","🌺","💎","🌊","🍃","🌙","😈"];

interface Props {
  initial?: Character | null;
  onSave: (c: Omit<Character, "id" | "createdAt">) => void;
  onClose: () => void;
}

export default function CharacterForm({ initial, onSave, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [personality, setPersonality] = useState(initial?.personality ?? "");
  const [background, setBackground] = useState(initial?.background ?? "");
  const [avatar, setAvatar] = useState(initial?.avatar ?? "🌸");
  const [chatBg, setChatBg] = useState(initial?.chatBg ?? GRADIENTS[0]);
  const [bgUrl, setBgUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(
    initial?.avatar?.startsWith("http") ? initial.avatar : ""
  );
  const [tab, setTab] = useState<"gradient" | "url">(
    initial?.chatBg?.startsWith("http") ? "url" : "gradient"
  );

  function handleSave() {
    if (!name.trim()) return;
    const finalAvatar = avatarUrl.trim() ? avatarUrl.trim() : avatar;
    const finalBg = tab === "url" && bgUrl.trim() ? bgUrl.trim() : chatBg;
    onSave({ name: name.trim(), personality, background, avatar: finalAvatar, chatBg: finalBg });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[#12121c] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            {initial ? "Edit Character" : "Create Character"}
          </h2>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto scrollbar-thin">
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Avatar</label>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl border border-white/10 bg-white/5 overflow-hidden flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : avatar}
              </div>
              <input
                type="text"
                placeholder="Or paste an image URL…"
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => { setAvatar(e); setAvatarUrl(""); }}
                  className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all ${avatar === e && !avatarUrl ? "bg-pink-600/40 ring-1 ring-pink-500" : "bg-white/5 hover:bg-white/10"}`}
                >{e}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Name *</label>
            <input
              type="text"
              placeholder="e.g. Luna, Aria, Nova…"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Personality</label>
            <textarea
              rows={3}
              placeholder="e.g. Playful, teasing, deeply caring. Loves late-night conversations and isn't afraid to be bold…"
              value={personality}
              onChange={e => setPersonality(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Backstory</label>
            <textarea
              rows={4}
              placeholder="e.g. Luna grew up in a small coastal town and moved to the city chasing her dreams as a musician…"
              value={background}
              onChange={e => setBackground(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Chat Background</label>
            <div className="flex gap-2 mb-3">
              {(["gradient", "url"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${tab === t ? "bg-pink-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
                >{t === "gradient" ? "Gradient" : "Image URL"}</button>
              ))}
            </div>
            {tab === "gradient" ? (
              <div className="grid grid-cols-4 gap-2">
                {GRADIENTS.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => setChatBg(g)}
                    style={{ background: g }}
                    className={`h-12 rounded-lg border-2 transition-all ${chatBg === g ? "border-pink-500" : "border-transparent hover:border-white/30"}`}
                  />
                ))}
              </div>
            ) : (
              <input
                type="text"
                placeholder="https://example.com/background.jpg"
                value={bgUrl}
                onChange={e => setBgUrl(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50"
              />
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {initial ? "Save Changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
