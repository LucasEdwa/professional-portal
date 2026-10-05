import { createSupabaseServerClient } from '@/lib/supabase';
import Link from 'next/link';
import { retryRefund } from './actions';

type RefundIssue = {
  session_id: string;
  patient_email: string;
  professional_name: string | null;
  price_sek_ore: number | null;
  refund_status: string;
  refund_error: string | null;
  stripe_payment_intent_id: string | null;
  cancelled_at: string | null;
};

export default async function RefundsPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_list_refund_issues');
  const issues = (data ?? []) as RefundIssue[];

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header>
        <Link href="/admin" className="text-sm text-blue-400 hover:underline">← Applications</Link>
        <h1 className="text-2xl font-semibold mt-3">Refunds</h1>
        <p className="text-sm text-gray-400 mt-1">
          Pending refunds are processed every 5 minutes. Failed ones need a look in Stripe before retrying.
        </p>
      </header>

      {error && <p className="text-red-400 text-sm">{error.message}</p>}
      {!error && issues.length === 0 && <p className="text-gray-500 text-sm">No pending or failed refunds.</p>}

      <ul className="space-y-3">
        {issues.map((r) => (
          <li key={r.session_id} className="rounded-xl bg-gray-900 border border-gray-800 p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {r.patient_email} · {((r.price_sek_ore ?? 0) / 100).toFixed(0)} SEK · {r.professional_name ?? '—'}
              </p>
              <span className={`text-xs font-semibold ${r.refund_status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>
                {r.refund_status}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-mono">{r.stripe_payment_intent_id ?? 'no payment intent'}</p>
            {r.refund_error && <p className="text-xs text-red-300">{r.refund_error}</p>}
            {r.refund_status === 'failed' && (
              <form action={retryRefund}>
                <input type="hidden" name="session_id" value={r.session_id} />
                <button className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium">Retry refund</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
