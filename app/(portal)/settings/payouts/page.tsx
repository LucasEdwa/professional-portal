import { createSupabaseServerClient } from '@/lib/supabase';
import Link from 'next/link';
import { fetchConnectStatus, openStripeDashboard, startOnboarding } from './actions';

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ return?: string }> }) {
  const { return: returned } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('professional_profiles')
    .select('stripe_account_id, stripe_payouts_enabled, session_price_sek_ore')
    .eq('id', user!.id)
    .single();

  // Coming back from Stripe (or already connected): sync the live status.
  const status = profile?.stripe_account_id || returned ? await fetchConnectStatus() : null;
  const enabled = status && 'enabled' in status ? status.enabled : !!profile?.stripe_payouts_enabled;
  const price = (profile?.session_price_sek_ore ?? 0) / 100;

  return (
    <main className="px-6 py-8 max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-blue-400 hover:underline">← Settings</Link>
        <h1 className="text-2xl font-semibold text-white mt-3">Payouts</h1>
        <p className="text-sm text-gray-400 mt-1">
          HomeWithin uses Stripe to take payments from clients and pay you out to your bank account.
          A platform fee is deducted from each paid session.
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
        <p className="text-sm">
          Status:{' '}
          {enabled ? (
            <span className="text-green-400 font-medium">Payouts enabled</span>
          ) : profile?.stripe_account_id ? (
            <span className="text-yellow-400 font-medium">Setup incomplete</span>
          ) : (
            <span className="text-gray-400 font-medium">Not set up</span>
          )}
        </p>
        {status && 'requirementsDue' in status && status.requirementsDue > 0 && (
          <p className="text-xs text-yellow-300/80">Stripe needs {status.requirementsDue} more detail(s) from you.</p>
        )}
        {status && 'error' in status && <p className="text-xs text-red-400">{status.error}</p>}
        {price > 0 && !enabled && (
          <p className="text-xs text-amber-300">
            Your price is {price.toFixed(0)} SEK, so clients can&apos;t book you until payouts are enabled.
            Set the price to 0 in Settings to offer free sessions meanwhile.
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          {!enabled && (
            <form action={startOnboarding}>
              <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium">
                {profile?.stripe_account_id ? 'Continue Stripe setup' : 'Set up payouts with Stripe'}
              </button>
            </form>
          )}
          {profile?.stripe_account_id && (
            <form action={openStripeDashboard}>
              <button className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium">
                Open Stripe dashboard
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
