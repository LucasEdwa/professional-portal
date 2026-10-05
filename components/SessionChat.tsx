'use client';

import { containsCrisisKeywords } from '@/lib/crisis';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useEffect, useRef, useState } from 'react';

type Message = { id: string; sender_id: string; body: string; created_at: string };

function merge(list: Message[], message: Message): Message[] {
  if (list.some((m) => m.id === message.id)) return list;
  return [...list, message].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export default function SessionChat({
  sessionId,
  professionalId,
  canSend,
  timeZone,
}: {
  sessionId: string;
  professionalId: string;
  canSend: boolean;
  timeZone: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    supabase
      .from('session_messages')
      .select('id, sender_id, body, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (active) setMessages((data ?? []) as Message[]);
      });
    supabase.rpc('mark_session_read', { p_session_id: sessionId }).then(() => undefined);

    const channel = supabase
      .channel(`portal-session-messages:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'session_messages', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setMessages((prev) => merge(prev, payload.new as Message));
          supabase.rpc('mark_session_read', { p_session_id: sessionId }).then(() => undefined);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: insertError } = await supabase
      .from('session_messages')
      .insert({ session_id: sessionId, sender_id: professionalId, body })
      .select('id, sender_id, body, created_at')
      .single();
    setSending(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setMessages((prev) => merge(prev, data as Message));
    setInput('');
    supabase.functions.invoke('send-push', { body: { type: 'session_message', sessionId } }).catch(() => undefined);
  }

  const crisisFlagged = messages.some((m) => m.sender_id !== professionalId && containsCrisisKeywords(m.body));

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50">
      {crisisFlagged && (
        <p className="m-3 rounded-lg border border-red-800/60 bg-red-900/30 px-3 py-2 text-xs text-red-300">
          A message from your client may indicate risk of self-harm. Follow your safety protocol; the client
          was shown emergency numbers (112, Mind 90101).
        </p>
      )}
      <div className="max-h-80 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">No messages yet.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === professionalId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                  mine
                    ? 'bg-blue-600 text-white'
                    : containsCrisisKeywords(m.body)
                      ? 'bg-red-900/50 text-red-100 ring-1 ring-red-600'
                      : 'bg-gray-800 text-gray-100'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`text-[10px] mt-1 text-right ${mine ? 'text-blue-100/70' : 'text-gray-500'}`}>
                  {new Date(m.created_at).toLocaleString('en-SE', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone,
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {canSend ? (
        <form onSubmit={send} className="flex gap-2 border-t border-gray-800 p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            maxLength={2000}
            rows={1}
            placeholder="Write a message… (Enter to send)"
            className="flex-1 resize-none rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            disabled={sending || !input.trim()}
            className="px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-medium"
          >
            Send
          </button>
        </form>
      ) : (
        <p className="border-t border-gray-800 p-3 text-xs text-gray-500 text-center">
          Messaging is available while the session is confirmed.
        </p>
      )}
      {error && <p className="px-3 pb-3 text-xs text-red-400">{error}</p>}
    </div>
  );
}
