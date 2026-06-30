"use client";
import { useState, useEffect, useCallback } from "react";
import type { LogEntry } from "../lib/logs";

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = useCallback(async () => {
    const res = await fetch("/api/logs");
    const data = await res.json();
    setLogs(data.logs ?? []);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(fetchLogs, 3000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchLogs]);

  return (
    <div className="min-h-screen bg-[#09090f] text-white font-mono">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-white">Groq Output Log</h1>
            <p className="text-xs text-white/30 mt-0.5">Last {logs.length} requests · in-memory, resets on cold start</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-white/40 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                className="accent-pink-500"
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchLogs}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              Refresh
            </button>
          </div>
        </div>

        {logs.length === 0 && (
          <div className="text-center py-20 text-white/20 text-sm">
            No logs yet — send a message in the chat first
          </div>
        )}

        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">

              {/* Summary row */}
              <button
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/4 transition-colors"
              >
                <span className="text-pink-400 font-semibold text-sm flex-shrink-0">{log.characterName}</span>
                <span className="flex-1 text-white/50 text-xs truncate">{log.userMessage}</span>
                <span className="text-white/25 text-xs flex-shrink-0">{timeAgo(log.ts)}</span>
                {log.inputTokens && (
                  <span className="text-white/20 text-xs flex-shrink-0">{log.inputTokens}→{log.outputTokens}tk</span>
                )}
                <span className="text-white/25 text-xs flex-shrink-0">{expanded === log.id ? "▲" : "▼"}</span>
              </button>

              {/* Reply preview */}
              <div className="px-4 pb-3 text-xs text-emerald-400/80 border-t border-white/5 pt-2 truncate">
                ↳ {log.rawReply}
              </div>

              {/* Expanded */}
              {expanded === log.id && (
                <div className="border-t border-white/8 divide-y divide-white/5">

                  <div className="px-4 py-3">
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-2">System Prompt</p>
                    <pre className="text-xs text-white/60 whitespace-pre-wrap leading-relaxed">{log.systemPrompt}</pre>
                  </div>

                  <div className="px-4 py-3">
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-2">User Message</p>
                    <pre className="text-xs text-white/70 whitespace-pre-wrap">{log.userMessage}</pre>
                  </div>

                  <div className="px-4 py-3">
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Raw Groq Reply</p>
                    <pre className="text-xs text-emerald-300 whitespace-pre-wrap leading-relaxed">{log.rawReply}</pre>
                  </div>

                  <div className="px-4 py-3 flex gap-6 text-xs text-white/25">
                    <span>Model: {log.model}</span>
                    {log.inputTokens && <span>In: {log.inputTokens} tokens</span>}
                    {log.outputTokens && <span>Out: {log.outputTokens} tokens</span>}
                    <span>{new Date(log.ts).toLocaleTimeString()}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
