"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { loadGroupMessages, sendGroupMessage } from "@/lib/store";
import type { GroupMessage } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function GroupChat({ planId, userId }: { planId: string; userId: string }) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setMessages(await loadGroupMessages(planId));
      setError("");
    } catch {
      setError("Could not load messages.");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    void refresh();
    const channel = supabase.channel(`group-chat:${planId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "group_messages", filter: `plan_id=eq.${planId}`,
      }, () => { void refresh(); })
      .subscribe();
    const interval = window.setInterval(() => { void refresh(); }, 15000);
    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [planId, refresh]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await sendGroupMessage(planId, body);
      setDraft("");
      await refresh();
    } catch {
      setError("Could not send message. Check your group membership and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-8 rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Group chat</h2>
      <p className="mt-1 text-sm text-neutral-500">Visible to confirmed members of this group.</p>
      <div role="log" aria-label="Group messages" className="mt-5 max-h-96 space-y-3 overflow-y-auto rounded-2xl bg-neutral-50 p-4">
        {loading && <p className="text-sm text-neutral-500">Loading messages...</p>}
        {!loading && !error && messages.length === 0 && <p className="text-sm text-neutral-500">No messages yet. Say hello to your group.</p>}
        {messages.map((message) => (
          <div key={message.id} className={`max-w-[85%] rounded-2xl p-3 text-sm ${message.sender_id === userId ? "ml-auto bg-black text-white" : "bg-white text-neutral-800"}`}>
            <div className={`mb-1 flex gap-2 text-xs ${message.sender_id === userId ? "text-neutral-300" : "text-neutral-500"}`}>
              <strong>{message.sender_id === userId ? "You" : message.sender_name}</strong>
              <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time>
            </div>
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
          </div>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input aria-label="Message" maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Message your group" className="min-w-0 flex-1 rounded-xl border border-black/10 px-4 py-3" />
        <button disabled={!draft.trim() || sending} className="rounded-xl bg-black px-5 py-3 text-white disabled:bg-neutral-300">{sending ? "Sending..." : "Send"}</button>
      </form>
    </div>
  );
}
