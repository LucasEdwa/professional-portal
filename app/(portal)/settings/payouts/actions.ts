'use server';

import { createSupabaseServerClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';

type ConnectAction = 'onboard' | 'status' | 'dashboard';

export type ConnectStatus = { enabled: boolean; detailsSubmitted: boolean; requirementsDue: number };

async function callConnect<T>(action: ConnectAction): Promise<T> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>('stripe-connect', {
    body: { action },
  });
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(body?.error ?? 'Stripe request failed. Please try again.');
  }
  if (data && 'error' in data && data.error) throw new Error(data.error);
  return data as T;
}

export async function fetchConnectStatus(): Promise<ConnectStatus | { error: string }> {
  try {
    return await callConnect<ConnectStatus>('status');
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Form actions: redirect the browser to Stripe-hosted pages. */
export async function startOnboarding() {
  const { url } = await callConnect<{ url: string }>('onboard');
  redirect(url);
}

export async function openStripeDashboard() {
  const { url } = await callConnect<{ url: string }>('dashboard');
  redirect(url);
}
