'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useActionState, useEffect, useState } from 'react';
import { cancelSession, recordOutcome, saveNote, type SessionActionState } from './actions';

function Feedback({ state }: { state: SessionActionState }) {
  if (state.error) return <p className="text-sm text-red-400">{state.error}</p>;
  if (state.message) return <p className="text-sm text-green-400">{state.message}</p>;
  return null;
}

/**
 * Enabled from `opensAt` until `closesAt` (re-checked every 30 s). The call link
 * comes from the create-call-token Edge Function, which re-checks access.
 */
export function JoinCallButton({ sessionId, opensAt, closesAt }: { sessionId: string; opensAt: string; closesAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (now > Date.parse(closesAt)) return null;
  const open = now >= Date.parse(opensAt);

  async function join() {
    setError(null);
    setJoining(true);
    // Open the tab synchronously (popup blockers), then point it at the call.
    const tab = window.open('about:blank', '_blank');
    const { data, error: fnError } = await createSupabaseBrowserClient().functions.invoke<{ url: string }>(
      'create-call-token',
      { body: { sessionId } },
    );
    setJoining(false);
    if (fnError || !data?.url) {
      tab?.close();
      const body = await (fnError as { context?: Response } | null)?.context?.json?.().catch(() => null);
      setError(body?.error ?? 'Could not start the call. Please try again.');
      return;
    }
    if (tab) {
      tab.opener = null; // the call page must not be able to script the portal
      tab.location.href = data.url;
    }
    else window.location.href = data.url;
  }

  return open ? (
    <div className="space-y-1">
      <button
        onClick={join}
        disabled={joining}
        className="block w-full text-center py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium transition-colors"
      >
        {joining ? 'Connecting…' : 'Join video call'}
      </button>
      {error && <p className="text-sm text-red-400 text-center">{error}</p>}
    </div>
  ) : (
    <p className="w-full text-center py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-sm text-gray-500">
      The call opens 15 minutes before the session starts
    </p>
  );
}

export function CancelSessionForm({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState<SessionActionState, FormData>(cancelSession, {});
  const [reason, setReason] = useState('');

  return (
    <details className="rounded-xl border border-gray-800 px-4 py-3">
      <summary className="cursor-pointer text-sm text-red-400">Cancel this session</summary>
      <form
        action={action}
        onSubmit={(e) => {
          if (!confirm('Cancel this session? The client will be notified.')) e.preventDefault();
        }}
        className="mt-3 space-y-2"
      >
        <input type="hidden" name="session_id" value={sessionId} />
        <textarea
          name="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Message to the client (required)"
          className="w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <button
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-sm font-medium"
        >
          {pending ? 'Cancelling…' : 'Cancel session'}
        </button>
        <Feedback state={state} />
      </form>
    </details>
  );
}

export function OutcomeForm({ sessionId, status }: { sessionId: string; status: string }) {
  const [state, action, pending] = useActionState<SessionActionState, FormData>(recordOutcome, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="session_id" value={sessionId} />
      <p className="text-sm text-gray-400">How did the session go?</p>
      <div className="flex gap-2">
        <button
          name="outcome"
          value="completed"
          disabled={pending || status === 'completed'}
          className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-sm"
        >
          Completed
        </button>
        <button
          name="outcome"
          value="no_show"
          disabled={pending || status === 'no_show'}
          className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-sm"
        >
          Client didn&apos;t show
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function NotesForm({
  sessionId,
  initialBody,
  initialShared,
}: {
  sessionId: string;
  initialBody: string;
  initialShared: boolean;
}) {
  const [state, action, pending] = useActionState<SessionActionState, FormData>(saveNote, {});
  // Controlled fields: React 19 resets uncontrolled inputs after a form action.
  const [body, setBody] = useState(initialBody);
  const [shared, setShared] = useState(initialShared);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="session_id" value={sessionId} />
      <textarea
        name="body"
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
          name="is_shared_with_ai"
          checked={shared}
          onChange={(e) => setShared(e.target.checked)}
          className="mt-0.5 accent-blue-500"
        />
        <div>
          <p className="text-sm font-medium">Share with AI Companion</p>
          <p className="text-xs text-gray-400 mt-0.5">
            When enabled, the client is asked whether their AI companion may use your most recent shared
            notes as background between sessions. Only if they agree are the notes sent, with their chat, to
            a third-party AI service. The companion is instructed never to quote them. Write accordingly.
          </p>
        </div>
      </label>

      <Feedback state={state} />
      <button
        disabled={pending}
        className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium transition-colors"
      >
        {pending ? 'Saving…' : 'Save notes'}
      </button>
    </form>
  );
}
