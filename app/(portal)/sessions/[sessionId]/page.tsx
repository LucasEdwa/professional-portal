import SessionChat from '@/components/SessionChat';
import StatusBadge from '@/components/StatusBadge';
import { VIDEO_JOIN_CLOSES_MINUTES_AFTER, VIDEO_JOIN_OPENS_MINUTES_BEFORE } from '@/lib/constants';
import { firstEmbed } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/professional';
import { createSupabaseServerClient } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CancelSessionForm, JoinCallButton, NotesForm, OutcomeForm } from './SessionControls';


type PatientEmbed = { nickname?: string } | null;

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: session }, { data: me }, { data: note }] = await Promise.all([
    supabase
      .from('professional_sessions')
      .select('id, user_id, scheduled_at, duration_minutes, status, cancellation_reason, cancelled_by, user_profiles!user_id(nickname)')
      .eq('id', sessionId)
      .eq('professional_id', user!.id)
      .maybeSingle(),
    supabase.from('professional_profiles').select('timezone').eq('id', user!.id).single(),
    supabase.from('session_notes').select('body, is_shared_with_ai').eq('session_id', sessionId).maybeSingle(),
  ]);

  if (!session) notFound();

  // Patientdatalagen: log every opening of a client's records.
  await supabase.rpc('log_record_access', {
    p_patient_id: session.user_id,
    p_session_id: session.id,
    p_action: 'view_session',
  });

  const timeZone = me?.timezone ?? DEFAULT_TIMEZONE;
  const patient = firstEmbed(session.user_profiles as PatientEmbed | PatientEmbed[]);
  const start = new Date(session.scheduled_at);
  const end = new Date(start.getTime() + session.duration_minutes * 60_000);
  const hasStarted = start.getTime() <= Date.now();
  const isActive = session.status === 'pending' || session.status === 'confirmed';

  const when = `${start.toLocaleDateString('en-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  })} · ${start.toLocaleTimeString('en-SE', { hour: '2-digit', minute: '2-digit', timeZone })}–${end.toLocaleTimeString(
    'en-SE',
    { hour: '2-digit', minute: '2-digit', timeZone },
  )}`;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <Link href="/sessions" className="text-sm text-blue-400 hover:underline">
        ← Sessions
      </Link>

      <div className="rounded-xl bg-gray-900 border border-gray-800 px-5 py-4 space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/patients/${session.user_id}`} className="font-semibold hover:text-blue-300">
            {patient?.nickname ?? 'Anonymous'}
          </Link>
          <StatusBadge status={session.status} />
        </div>
        <p className="text-xs text-gray-400">
          {when} · {session.duration_minutes} min
        </p>
        {session.status === 'pending' && (
          <p className="text-xs text-yellow-400/80">Waiting for the client&apos;s payment.</p>
        )}
        {session.status === 'cancelled' && (
          <p className="text-xs text-red-400/80">
            Cancelled by {session.cancelled_by === user!.id ? 'you' : 'the client'}
            {session.cancellation_reason ? `: “${session.cancellation_reason}”` : ''}
          </p>
        )}
      </div>

      {session.status === 'confirmed' && (
        <JoinCallButton
          sessionId={session.id}
          opensAt={new Date(start.getTime() - VIDEO_JOIN_OPENS_MINUTES_BEFORE * 60_000).toISOString()}
          closesAt={new Date(end.getTime() + VIDEO_JOIN_CLOSES_MINUTES_AFTER * 60_000).toISOString()}
        />
      )}

      {hasStarted && ['confirmed', 'completed', 'no_show'].includes(session.status) && (
        <OutcomeForm sessionId={session.id} status={session.status} />
      )}

      {isActive && !hasStarted && <CancelSessionForm sessionId={session.id} />}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Messages</h2>
        <SessionChat
          sessionId={session.id}
          professionalId={user!.id}
          canSend={session.status === 'confirmed'}
          timeZone={timeZone}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Session notes</h2>
        <NotesForm
          sessionId={session.id}
          initialBody={note?.body ?? ''}
          initialShared={note?.is_shared_with_ai ?? false}
        />
      </section>
    </main>
  );
}
