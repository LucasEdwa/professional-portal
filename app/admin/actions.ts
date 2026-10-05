'use server';

import { createSupabaseServerClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export type ReviewState = { error?: string; done?: string };

const DECISIONS = ['approved', 'rejected', 'suspended'] as const;
type Decision = (typeof DECISIONS)[number];

export async function reviewProfessional(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const professionalId = String(formData.get('professional_id') ?? '');
  const decision = String(formData.get('decision') ?? '') as Decision;
  const reason = String(formData.get('reason') ?? '').trim();

  if (!DECISIONS.includes(decision)) return { error: 'Unknown decision.' };
  if (decision !== 'approved' && !reason) return { error: 'Please give a reason. The applicant will see it.' };

  const supabase = await createSupabaseServerClient();
  // The RPC re-checks admin rights and the allowed status transition.
  const { error } = await supabase.rpc('review_professional', {
    p_professional_id: professionalId,
    p_decision: decision,
    p_reason: reason || null,
  });

  if (error) return { error: error.message };

  revalidatePath('/admin');
  return { done: decision };
}
