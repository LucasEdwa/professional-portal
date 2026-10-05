'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { JITSI_BASE_URL } from '@/lib/constants';

interface SessionNote {
  id: string;
  body: string;
  isSharedWithAi: boolean;
}

interface Session {
  id: string;
  scheduledAt: string;
  status: string;
  patientNickname: string;
  userId: string;
}

export default function SessionNotesPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const [sessionId, setSessionId] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [note, setNote] = useState<SessionNote | null>(null);
  const [body, setBody] = useState('');
  const [sharedWithAi, setSharedWithAi] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    params.then(({ sessionId: id }) => {
      setSessionId(id);
      loadData(id);
    });
  }, []);

  async function loadData(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: s } = await supabase
      .from('professional_sessions')
      .select('id, scheduled_at, status, user_profiles!user_id(nickname)')
      .eq('id', id)
      .eq('professional_id', user.id)
      .single();

    if (s) {
      const profile = (s as Record<string, unknown>).user_profiles as Record<string, unknown> | null;
      setSession({
        id: s.id as string,
        scheduledAt: s.scheduled_at as string,
        status: s.status as string,
        patientNickname: (profile?.nickname as string) ?? 'Anonymous',
        userId: '', // not needed on client
      });
    }

    const { data: n } = await supabase
      .from('session_notes')
      .select('*')
      .eq('session_id', id)
      .single();

    if (n) {
      setNote({
        id: n.id as string,
        body: n.body as string,
        isSharedWithAi: n.is_shared_with_ai as boolean,
      });
      setBody(n.body as string);
      setSharedWithAi(n.is_shared_with_ai as boolean);
    }
  }

  function handleSave() {
    startTransition(async () => {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: s } = await supabase
        .from('professional_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single();

      const { error: upsertError } = await supabase
        .from('session_notes')
        .upsert(
          {
            session_id: sessionId,
            professional_id: user.id,
            user_id: (s as Record<string, unknown>)?.user_id,
            body,
            is_shared_with_ai: sharedWithAi,
          },
          { onConflict: 'session_id' }
        );

      if (upsertError) {
        setError(upsertError.message);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    );
  }

  const jitsiUrl = `${JITSI_BASE_URL}/homewithin-${sessionId}`;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">
          ← Dashboard
        </Link>
      </div>

      <div className="rounded-xl bg-gray-900 border border-gray-800 px-5 py-4 space-y-1">
        <p className="font-semibold">{session.patientNickname}</p>
        <p className="text-xs text-gray-400">
          {new Date(session.scheduledAt).toLocaleDateString('en-SE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        <span
          className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
            session.status === 'confirmed'
              ? 'bg-green-900/50 text-green-400'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          {session.status}
        </span>
      </div>

      {session.status === 'confirmed' && (
        <a
          href={jitsiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors"
        >
          Join Video Call
        </a>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          Session Notes
        </h2>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={10}
          placeholder="Add your session notes here…"
          className="w-full rounded-xl bg-gray-900 border border-gray-800 px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <p className="text-xs text-gray-600 text-right">{body.length}/2000</p>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={sharedWithAi}
            onChange={(e) => setSharedWithAi(e.target.checked)}
            className="mt-0.5 accent-blue-500"
          />
          <div>
            <p className="text-sm font-medium">Share with AI Companion</p>
            <p className="text-xs text-gray-400 mt-0.5">
              When enabled, the patient's AI companion can reference these notes to provide
              context-aware support between sessions. Notes are never shown verbatim.
            </p>
          </div>
        </label>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          {isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save Notes'}
        </button>
      </section>
    </main>
  );
}
