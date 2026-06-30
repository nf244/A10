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

// Drag-to-reposition + zoom picker
function BgPositionPicker({ src, position, zoom, onChange, onChangeZoom }: {
  src: string;
  position: string;
  zoom: number;
  onChange: (pos: string) => void;
  onChangeZoom: (zoom: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function pick(clientX: number, clientY: number) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((clientY - rect.top) / rect.height) * 100)));
    onChange(`${x}% ${y}%`);
  }

  const [px, py] = position.replace(/%/g, "").split(" ").map(Number);
  const pct = Math.round(zoom * 100);

  return (
    <div className="space-y-2">
      <div
        ref={ref}
        className="relative w-full h-32 rounded-xl overflow-hidden cursor-crosshair select-none touch-none"
        style={{ backgroundImage: `url(${src})`, backgroundSize: `${zoom * 100}%`, backgroundPosition: position, backgroundColor: "#000" }}
        onMouseDown={e => { dragging.current = true; pick(e.clientX, e.clientY); }}
        onMouseMove={e => { if (dragging.current) pick(e.clientX, e.clientY); }}
        onMouseUp={() => { dragging.current = false; }}
        onMouseLeave={() => { dragging.current = false; }}
        onTouchStart={e => pick(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={e => { e.preventDefault(); pick(e.touches[0].clientX, e.touches[0].clientY); }}
      >
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        <div
          className="absolute w-5 h-5 rounded-full border-2 border-white bg-white/40 shadow-lg pointer-events-none"
          style={{ left: `${px}%`, top: `${py}%`, transform: "translate(-50%, -50%)" }}
        />
        <p className="absolute bottom-2 inset-x-0 text-center text-xs text-white/60 pointer-events-none">
          Drag to reposition
        </p>
      </div>

      {/* Zoom slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-white/40 flex-shrink-0">Zoom</span>
        <input
          type="range" min={25} max={300} step={5}
          value={pct}
          onChange={e => onChangeZoom(Number(e.target.value) / 100)}
          className="flex-1 h-1 accent-pink-500 cursor-pointer"
        />
        <span className="text-xs text-white/50 w-10 text-right flex-shrink-0">{pct}%</span>
        {pct !== 100 && (
          <button
            onClick={() => onChangeZoom(1)}
            className="text-xs text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
          >reset</button>
        )}
      </div>
    </div>
  );
}

interface ImageInputProps {
  value: string;
  onChange: (v: string) => void;
  maxW: number;
  maxH: number;
  placeholder?: string;
  label: string;
  preview?: React.ReactNode;
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
      onChange(await readImageFile(file, maxW, maxH));
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
      {label && <label className="text-xs font-medium text-white/50 uppercase tracking-wider block">{label}</label>}
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
          <>{preview}<p className="text-xs text-white/40">Click, paste, or drop to replace</p></>
        ) : (
          <>
            <span className="text-2xl">🖼️</span>
            <p className="text-xs text-white/50 text-center px-4">Click to browse · Paste (Ctrl/⌘+V) · or drag & drop</p>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => processFile(e.target.files?.[0] ?? null)} />
      </div>

      <div className="relative">
        <input
          type="url" inputMode="url" autoCapitalize="none" autoCorrect="off"
          placeholder={placeholder ?? "Or paste a URL…"}
          value={isData ? "" : value}
          onChange={e => onChange(e.target.value)}
          onPaste={handlePaste}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-pink-500/50 transition-colors pr-8"
          style={{ fontSize: "16px" }}
        />
        {value && (
          <button onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/40 hover:text-white text-xs transition-all">
            ✕
          </button>
        )}
      </div>

      {wasConverted && <p className="text-xs text-emerald-400/80">✓ Google Drive link converted</p>}
      {isPhotos && <p className="text-xs text-amber-400/80">⚠ Google Photos links don&apos;t work — use Drive instead</p>}
      {isData && <p className="text-xs text-white/30">✓ Image stored locally</p>}
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
  const [avatar, setAvatar] = useState(
    initial?.avatar && !initial.avatar.startsWith("http") && !initial.avatar.startsWith("data:") && initial.avatar !== "@bg"
      ? initial.avatar : "🌸"
  );
  const [chatBg, setChatBg] = useState(initial?.chatBg ?? GRADIENTS[0]);
  const [chatBgPos, setChatBgPos] = useState(initial?.chatBgPos ?? "50% 40%");
  const [chatBgZoom, setChatBgZoom] = useState(initial?.chatBgZoom ?? 1);
  const [avatarSrc, setAvatarSrc] = useState(
    initial?.avatar === "@bg" ? "@bg" :
    (initial?.avatar?.startsWith("http") || initial?.avatar?.startsWith("data:") ? initial.avatar : "")
  );
  const [bgSrc, setBgSrc] = useState(
    initial?.chatBg?.startsWith("http") || initial?.chatBg?.startsWith("data:") ? initial.chatBg : ""
  );
  const [bgTab, setBgTab] = useState<"gradient" | "image">(
    initial?.chatBg?.startsWith("http") || initial?.chatBg?.startsWith("data:") ? "image" : "gradient"
  );

  const resolvedAvatar = resolveImageUrl(avatarSrc === "@bg" ? bgSrc : avatarSrc);
  const resolvedBg = resolveImageUrl(bgSrc);
  const hasBgImage = bgTab === "image" && !!bgSrc.trim();

  function handleSave() {
    if (!name.trim()) return;
    const finalAvatar = avatarSrc === "@bg" ? "@bg" : (avatarSrc.trim() ? resolvedAvatar : avatar);
    const finalBg = hasBgImage ? resolvedBg : chatBg;
    onSave({ name: name.trim(), personality, background, avatar: finalAvatar, chatBg: finalBg, chatBgPos, chatBgZoom });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-lg bg-[#12121c] sm:rounded-2xl rounded-t-3xl border border-white/10 shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88dvh]">

        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 px-5 py-3.5 border-b border-white/10 flex items-center justify-between flex-shrink-0 sm:rounded-t-2xl">
          <h2 className="text-base font-semibold text-white">{initial ? "Edit Character" : "Create Character"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5 min-h-0">

          {/* Avatar */}
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Avatar</label>

            {avatarSrc === "@bg" ? (
              /* Linked-to-background state */
              <div className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-white/10"
                  style={bgSrc ? { backgroundImage: `url(${resolvedBg})`, backgroundSize: "cover", backgroundPosition: chatBgPos } : undefined} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white leading-tight">Using background photo</p>
                  <p className="text-xs text-white/40 leading-tight mt-0.5">One image for both — saves space</p>
                </div>
                <button onClick={() => setAvatarSrc("")}
                  className="text-xs text-white/40 hover:text-white transition-colors flex-shrink-0">Change</button>
              </div>
            ) : (
              <ImageInput
                label=""
                value={avatarSrc}
                onChange={v => { setAvatarSrc(v); if (v) setAvatar(""); }}
                maxW={400} maxH={400}
                placeholder="Or paste an image URL…"
                preview={
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 bg-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolvedAvatar} alt="" className="w-full h-full object-cover" />
                  </div>
                }
              />
            )}

            {/* Emoji grid + link-to-bg button */}
            <div className="flex flex-wrap gap-2 mt-3">
              {hasBgImage && (
                <button
                  onClick={() => { setAvatarSrc("@bg"); setAvatar(""); }}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95
                    ${avatarSrc === "@bg" ? "bg-pink-600/40 ring-1 ring-pink-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
                >
                  📷 Use background photo
                </button>
              )}
              {EMOJIS.map(e => (
                <button key={e}
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
            <input type="text" placeholder="e.g. Luna, Aria, Nova…" value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 transition-colors"
              style={{ fontSize: "16px" }} />
          </div>

          {/* Personality */}
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Personality</label>
            <textarea rows={3} placeholder="e.g. Playful, teasing, deeply caring…" value={personality}
              onChange={e => setPersonality(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 resize-none transition-colors"
              style={{ fontSize: "16px" }} />
          </div>

          {/* Backstory */}
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Backstory</label>
            <textarea rows={4} placeholder="e.g. Luna grew up in a small coastal town…" value={background}
              onChange={e => setBackground(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 resize-none transition-colors"
              style={{ fontSize: "16px" }} />
          </div>

          {/* Chat Background */}
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2.5 block">Chat Background</label>
            <div className="flex gap-2 mb-3">
              {(["gradient", "image"] as const).map(t => (
                <button key={t} onClick={() => setBgTab(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${bgTab === t ? "bg-pink-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                  {t === "gradient" ? "Gradient" : "Image"}
                </button>
              ))}
            </div>

            {bgTab === "gradient" ? (
              <div className="grid grid-cols-4 gap-2">
                {GRADIENTS.map((g, i) => (
                  <button key={i} onClick={() => setChatBg(g)} style={{ background: g }}
                    className={`h-14 rounded-xl border-2 transition-all active:scale-95 ${chatBg === g ? "border-pink-500" : "border-transparent hover:border-white/30"}`} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <ImageInput
                  label=""
                  value={bgSrc}
                  onChange={v => {
                    setBgSrc(v);
                    // If avatar was linked, keep it linked to new image
                  }}
                  maxW={1280} maxH={960}
                  placeholder="Or paste an image URL…"
                  preview={
                    <div className="w-full h-12 rounded-lg bg-center bg-cover border border-white/10"
                      style={{ backgroundImage: `url(${resolvedBg})` }} />
                  }
                />

                {/* Position + zoom picker — shown once an image is set */}
                {bgSrc && (
                  <BgPositionPicker
                    src={resolvedBg}
                    position={chatBgPos}
                    zoom={chatBgZoom}
                    onChange={setChatBgPos}
                    onChangeZoom={setChatBgZoom}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/10 flex gap-3 justify-end flex-shrink-0 pb-safe">
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 active:bg-white/10 transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-90 active:opacity-80 disabled:opacity-40 transition-all">
            {initial ? "Save Changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
