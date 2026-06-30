import type { Character, Message } from "../types";

const DB_NAME = "musechat";
const DB_VERSION = 1;

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("characters")) {
        db.createObjectStore("characters", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("messages")) {
        db.createObjectStore("messages");
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      // Ask browser to never auto-evict this data
      navigator.storage?.persist?.();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

// localStorage backup: saves metadata only (no large base64 images)
// This ensures characters survive even if IndexedDB is cleared
function saveBackup(chars: Character[]) {
  try {
    const lite = chars.map(c => ({
      ...c,
      avatar: c.avatar.startsWith("data:") ? "🌸" : c.avatar,
      chatBg: c.chatBg.startsWith("data:") ? "linear-gradient(135deg,#1a1a2e,#16213e)" : c.chatBg,
    }));
    localStorage.setItem("mc_backup", JSON.stringify(lite));
  } catch { /* ignore quota errors */ }
}

function loadBackup(): Character[] {
  try { return JSON.parse(localStorage.getItem("mc_backup") || "[]"); } catch { return []; }
}

export async function dbGetCharacters(): Promise<Character[]> {
  const db = await openDB();
  const chars: Character[] = await new Promise((resolve, reject) => {
    const req = db.transaction("characters", "readonly").objectStore("characters").getAll();
    req.onsuccess = () => resolve(((req.result ?? []) as Character[]).sort((a, b) => a.createdAt - b.createdAt));
    req.onerror = () => reject(req.error);
  });

  if (chars.length > 0) return chars;

  // IndexedDB is empty — try migrating from old localStorage format
  try {
    const raw = localStorage.getItem("mc_characters");
    if (raw) {
      const legacy = JSON.parse(raw) as Character[];
      if (legacy.length > 0) {
        await dbPutCharacters(legacy);
        for (const c of legacy) {
          const msgs = localStorage.getItem(`mc_msgs_${c.id}`);
          if (msgs) {
            await dbPutMessages(c.id, JSON.parse(msgs) as Message[]);
            localStorage.removeItem(`mc_msgs_${c.id}`);
          }
        }
        localStorage.removeItem("mc_characters");
        return legacy.sort((a, b) => a.createdAt - b.createdAt);
      }
    }
  } catch { /* ignore */ }

  // Last resort: recover from metadata backup
  const backup = loadBackup();
  if (backup.length > 0) {
    await dbPutCharacters(backup);
    return backup;
  }

  return [];
}

export async function dbPutCharacters(chars: Character[]): Promise<void> {
  saveBackup(chars); // Always keep a metadata backup in localStorage
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("characters", "readwrite");
    const store = tx.objectStore("characters");
    store.clear();
    for (const c of chars) store.put(c);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbDeleteCharacter(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("characters", "readwrite");
    tx.objectStore("characters").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbGetMessages(characterId: string): Promise<Message[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction("messages", "readonly").objectStore("messages").get(characterId);
    req.onsuccess = () => resolve((req.result as Message[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPutMessages(characterId: string, msgs: Message[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("messages", "readwrite");
    tx.objectStore("messages").put(msgs.slice(-500), characterId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbDeleteMessages(characterId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("messages", "readwrite");
    tx.objectStore("messages").delete(characterId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
