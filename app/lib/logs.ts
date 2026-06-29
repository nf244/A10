export interface LogEntry {
  id: string;
  ts: number;
  characterName: string;
  systemPrompt: string;
  userMessage: string;
  rawReply: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

const MAX = 100;
const store: LogEntry[] = [];

export function addLog(entry: LogEntry) {
  store.unshift(entry);
  if (store.length > MAX) store.length = MAX;
}

export function getLogs(): LogEntry[] {
  return [...store];
}
