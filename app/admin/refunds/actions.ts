'use server';

import { createSupabaseServerClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function retryRefund(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await supabase.rpc('admin_retry_refund', { p_session_id: String(formData.get('session_id') ?? '') });
  revalidatePath('/admin/refunds');
}
