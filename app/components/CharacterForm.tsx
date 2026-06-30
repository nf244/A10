"use client";
import { useState, useRef, useCallback } from "react";
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

// Resize image file → base64 data URL via canvas
function readImageFile(file: File, maxW: number, maxH: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(blobUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("Failed to load image")); };
    img.src = blobUrl;
  });
}

function extractImageFromClipboard(e: React.ClipboardEvent | ClipboardEvent): File | null {
  const items = e.clipboardData?.items;
  if (!items) return null;
  for (const item of items) {
    if (item.type.startsWith("image/")) return item.getAsFile();
  }
  return null;
}

function extractImageFromDrop(e: React.DragEvent): File | null {
  for (const item of e.dataTransfer.items) {
    if (item.type.startsWith("image/")) return item.getAsFile();
  }
  return null;
}

interface ImageInputProps {
  value: string;
  onChange: (v: string) => void;
  maxW: number;
  maxH: number;
  placeholder?: string;
  label: string;
  preview?: React.ReactNode; // custom preview element
}

function ImageInput({ value, onChange, maxW, maxH, placeholder, label, preview }: ImageInputProps) {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const resolved = resolveImageUrl(value);
  const wasConverted = !value.startsWith("data:") && resolved !== value && value.trim() !== "";
  const isPhotos = isGooglePhotosUrl(value);
  const isData = value.startsWith("data:");

  async function processFile(file: File | null) {
    if (!file) return;
    setProcessing(true);
    try {
      const dataUrl = await readImageFile(file, maxW, maxH);
      onChange(dataUrl);
    } catch { /* ignore */ }
    finally { setProcessing(false); }
  }

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const file = extractImageFromClipboard(e);
    if (file) { e.preventDefault(); await processFile(file); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxW, maxH]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    await processFile(extractImageFromDrop(e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxW, maxH]);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-white/50 uppercase tracking-wider block">{label}</label>

      {/* Drop / paste zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onPaste={handlePaste}
        onClick={() => fileRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-1.5 select-none
          ${dragging ? "border-pink-500 bg-pink-500/10" : "border-white/15 bg-white/3 hover:border-white/30 hover:bg-white/5"}
          ${value ? "h-20" : "h-24"}`}
      >
        {processing ? (
          <p className="text-xs text-white/50">Processing…</p>
        ) : value ? (
          <>
            {preview}
            <p className="text-xs text-white/40">Click, paste, or drop to replace</p>
          </>
        ) : (
          <>
            <span className="text-2xl">🖼️</span>
            <p className="text-xs text-white/50 text-center px-4">
              Click to browse · Paste (Ctrl/⌘+V) · or drag & drop
            </p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => processFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* URL fallback */}
      <div className="relative">
        <input
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder={placeholder ?? "Or paste a URL…"}
          value={isData ? "" : value}
          onChange={e => onChange(e.target.value)}
          onPaste={handlePaste}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-pink-500/50 transition-colors pr-8"
          style={{ fontSize: "16px" }}
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/40 hover:text-white text-xs transition-all"
          >✕</button>
        )}
      </div>

      {wasConverted && (
        <p className="text-xs text-emerald-400/80">✓ Google Drive link converted to direct URL</p>
      )}
      {isPhotos && (
        <p className="text-xs text-amber-400/80">⚠ Google Photos links don&apos;t work — use Drive instead</p>
      )}
      {isData && (
        <p className="text-xs text-white/30">✓ Image stored locally</p>
      )}
    </div>
  );
}

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
  const [avatarSrc, setAvatarSrc] = useState(initial?.avatar?.startsWith("http") || initial?.avatar?.startsWith("data:") ? initial.avatar : "");
  const [bgSrc, setBgSrc] = useState(initial?.chatBg?.startsWith("http") || initial?.chatBg?.startsWith("data:") ? initial.chatBg : "");
  const [bgTab, setBgTab] = useState<"gradient" | "image">(
    initial?.chatBg?.startsWith("http") || initial?.chatBg?.startsWith("data:") ? "image" : "gradient"
  );

  const resolvedAvatar = resolveImageUrl(avatarSrc);
  const resolvedBg = resolveImageUrl(bgSrc);

  function handleSave() {
    if (!name.trim()) return;
    const finalAvatar = avatarSrc.trim() ? resolvedAvatar : avatar;
    const finalBg = bgTab === "image" && bgSrc.trim() ? resolvedBg : chatBg;
    onSave({ name: name.trim(), personality, background, avatar: finalAvatar, chatBg: finalBg });
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
          <h2 className="text-base font-semibold text-white">
            {initial ? "Edit Character" : "Create Character"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5 min-h-0">

          {/* Avatar */}
          <div>
            <ImageInput
              label="Avatar"
              value={avatarSrc}
              onChange={v => { setAvatarSrc(v); if (v) setAvatar(""); }}
              maxW={400}
              maxH={400}
              placeholder="Or paste an image URL…"
              preview={
                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resolvedAvatar} alt="" className="w-full h-full object-cover" />
                </div>
              }
            />
            {/* Emoji fallback */}
            <div className="flex flex-wrap gap-2 mt-3">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => { setAvatar(e); setAvatarSrc(""); }}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all active:scale-95
                    ${avatar === e && !avatarSrc ? "bg-pink-600/40 ring-1 ring-pink-500" : "bg-white/5 hover:bg-white/10"}`}
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
              {(["gradient", "image"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setBgTab(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${bgTab === t ? "bg-pink-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
                >{t === "gradient" ? "Gradient" : "Image"}</button>
              ))}
            </div>

            {bgTab === "gradient" ? (
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
              <ImageInput
                label=""
                value={bgSrc}
                onChange={setBgSrc}
                maxW={1280}
                maxH={960}
                placeholder="Or paste an image URL…"
                preview={
                  <div
                    className="w-full h-12 rounded-lg bg-center bg-cover border border-white/10"
                    style={{ backgroundImage: `url(${resolvedBg})` }}
                  />
                }
              />
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
