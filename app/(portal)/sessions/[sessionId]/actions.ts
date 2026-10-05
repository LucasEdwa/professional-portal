'use server';

import { createSupabaseServerClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export type SessionActionState = { error?: string; message?: string };

function revalidate(sessionId: string) {
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath('/sessions');
  revalidatePath('/dashboard');
  revalidatePath('/availability');
}

export async function cancelSession(_prev: SessionActionState, formData: FormData): Promise<SessionActionState> {
  const sessionId = String(formData.get('session_id') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!reason) return { error: 'Please tell the client why. They will see this message.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('cancel_session', { p_session_id: sessionId, p_reason: reason });
  if (error) return { error: error.message };
  revalidate(sessionId);
  return { message: 'Session cancelled. The slot is now blocked in your calendar.' };
}

export async function recordOutcome(_prev: SessionActionState, formData: FormData): Promise<SessionActionState> {
  const sessionId = String(formData.get('session_id') ?? '');
  const outcome = String(formData.get('outcome') ?? '');
  if (outcome !== 'completed' && outcome !== 'no_show') return { error: 'Unknown outcome.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('complete_session', { p_session_id: sessionId, p_outcome: outcome });
  if (error) return { error: error.message };
  revalidate(sessionId);
  return { message: outcome === 'completed' ? 'Marked as completed.' : 'Marked as no-show.' };
}

export async function saveNote(_prev: SessionActionState, formData: FormData): Promise<SessionActionState> {
  const sessionId = String(formData.get('session_id') ?? '');
  const body = String(formData.get('body') ?? '');
  const sharedWithAi = formData.get('is_shared_with_ai') === 'on';
  if (body.length > 2000) return { error: 'Notes can be at most 2000 characters.' };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Your session has expired. Please sign in again.' };

  // Patient comes from the session row, never from the client. RLS also checks it.
  const { data: session } = await supabase
    .from('professional_sessions')
    .select('user_id')
    .eq('id', sessionId)
    .eq('professional_id', user.id)
    .maybeSingle();
  if (!session) return { error: 'Session not found.' };

  const { error } = await supabase.from('session_notes').upsert(
    {
      session_id: sessionId,
      professional_id: user.id,
      user_id: session.user_id,
      body,
      is_shared_with_ai: sharedWithAi,
    },
    { onConflict: 'session_id' },
  );
  if (error) {
    // RLS requires an MFA-verified (aal2) session for client records.
    if (error.code === '42501') return { error: 'Please verify with your authenticator app and try again.' };
    return { error: error.message };
  }
  await supabase.rpc('log_record_access', {
    p_patient_id: session.user_id,
    p_session_id: sessionId,
    p_action: 'edit_note',
  });
  revalidatePath(`/sessions/${sessionId}`);
  return { message: 'Saved ✓' };
}
