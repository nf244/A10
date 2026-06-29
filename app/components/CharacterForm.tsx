"use client";
import { useState } from "react";
import { Character } from "../types";
import { resolveImageUrl, isGooglePhotosUrl } from "../lib/imageUrl";

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

function ImageUrlInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const resolved = resolveImageUrl(value);
  const wasConverted = resolved !== value && value.trim() !== "";
  const isPhotos = isGooglePhotosUrl(value);

  return (
    <div className="space-y-1.5">
      <input
        type="url"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 transition-colors"
        style={{ fontSize: "16px" }}
      />
      {wasConverted && (
        <p className="text-xs text-emerald-400/80 flex items-center gap-1">
          <span>✓</span> Google Drive link detected and converted to direct URL
        </p>
      )}
      {isPhotos && (
        <p className="text-xs text-amber-400/80 flex items-center gap-1">
          <span>⚠</span> Google Photos links don&apos;t work as images — use &quot;Share → Copy link&quot; in Google Drive instead
        </p>
      )}
    </div>
  );
}

export default function CharacterForm({ initial, onSave, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [personality, setPersonality] = useState(initial?.personality ?? "");
  const [background, setBackground] = useState(initial?.background ?? "");
  const [avatar, setAvatar] = useState(initial?.avatar ?? "🌸");
  const [chatBg, setChatBg] = useState(initial?.chatBg ?? GRADIENTS[0]);
  const [bgUrl, setBgUrl] = useState(initial?.chatBg?.startsWith("http") ? initial.chatBg : "");
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatar?.startsWith("http") ? initial.avatar : "");
  const [tab, setTab] = useState<"gradient" | "url">(
    initial?.chatBg?.startsWith("http") ? "url" : "gradient"
  );

  const resolvedAvatar = resolveImageUrl(avatarUrl);
  const resolvedBg = resolveImageUrl(bgUrl);

  function handleSave() {
    if (!name.trim()) return;
    const finalAvatar = avatarUrl.trim() ? resolvedAvatar : avatar;
    const finalBg = tab === "url" && bgUrl.trim() ? resolvedBg : chatBg;
    onSave({ name: name.trim(), personality, background, avatar: finalAvatar, chatBg: finalBg });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-lg bg-[#12121c] sm:rounded-2xl rounded-t-3xl border border-white/10 shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88dvh]">

        {/* Handle bar (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Title */}
        <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 px-5 py-3.5 border-b border-white/10 flex items-center justify-between flex-shrink-0 sm:rounded-t-2xl">
          <h2 className="text-base font-semibold text-white">
            {initial ? "Edit Character" : "Create Character"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5 min-h-0">

          {/* Avatar */}
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2.5 block">Avatar</label>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl border border-white/10 bg-white/5 overflow-hidden flex-shrink-0">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolvedAvatar} alt="" className="w-full h-full object-cover" onError={() => {}} />
                ) : avatar}
              </div>
              <div className="flex-1">
                <ImageUrlInput
                  value={avatarUrl}
                  onChange={setAvatarUrl}
                  placeholder="Paste image or Google Drive URL…"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => { setAvatar(e); setAvatarUrl(""); }}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all active:scale-95 ${avatar === e && !avatarUrl ? "bg-pink-600/40 ring-1 ring-pink-500" : "bg-white/5 hover:bg-white/10"}`}
                >{e}</button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Name *</label>
            <input
              type="text"
              placeholder="e.g. Luna, Aria, Nova…"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 transition-colors"
              style={{ fontSize: "16px" }}
            />
          </div>

          {/* Personality */}
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Personality</label>
            <textarea
              rows={3}
              placeholder="e.g. Playful, teasing, deeply caring. Loves late-night conversations and isn't afraid to be bold…"
              value={personality}
              onChange={e => setPersonality(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 resize-none transition-colors"
              style={{ fontSize: "16px" }}
            />
          </div>

          {/* Backstory */}
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Backstory</label>
            <textarea
              rows={4}
              placeholder="e.g. Luna grew up in a small coastal town and moved to the city chasing her dreams as a musician…"
              value={background}
              onChange={e => setBackground(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 resize-none transition-colors"
              style={{ fontSize: "16px" }}
            />
          </div>

          {/* Chat Background */}
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2.5 block">Chat Background</label>
            <div className="flex gap-2 mb-3">
              {(["gradient", "url"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${tab === t ? "bg-pink-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
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
                    className={`h-14 rounded-xl border-2 transition-all active:scale-95 ${chatBg === g ? "border-pink-500" : "border-transparent hover:border-white/30"}`}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <ImageUrlInput
                  value={bgUrl}
                  onChange={setBgUrl}
                  placeholder="Paste image or Google Drive URL…"
                />
                {resolvedBg && (
                  <div
                    className="h-24 rounded-xl bg-center bg-cover border border-white/10"
                    style={{ backgroundImage: `url(${resolvedBg})` }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex gap-3 justify-end flex-shrink-0 pb-safe">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 active:bg-white/10 transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-90 active:opacity-80 disabled:opacity-40 transition-all"
          >
            {initial ? "Save Changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
