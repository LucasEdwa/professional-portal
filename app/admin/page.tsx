import { SPECIALTY_LABELS, isSpecialty } from '@/lib/professional';
import { createSupabaseServerClient } from '@/lib/supabase';
import SignOutButton from '@/components/SignOutButton';
import Link from 'next/link';
import ReviewActions from './ReviewActions';

const TABS = [
  { key: 'pending_review', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'draft', label: 'Drafts' },
] as const;

type Application = {
  id: string;
  email: string;
  display_name: string;
  title: string;
  bio: string;
  specialties: string[];
  languages: string[];
  license_number: string;
  avatar_url: string | null;
  session_price_sek_ore: number;
  status: string;
  timezone: string;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
};

function fmt(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleString('en-SE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Stockholm' })
    : '—';
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const status = TABS.some((t) => t.key === raw) ? raw! : 'pending_review';

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_list_professionals', { p_status: status });
  const applications = (data ?? []) as Application[];

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">HomeWithin Admin</p>
          <h1 className="text-2xl font-semibold mt-1">Professional applications</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/refunds" className="text-sm text-blue-400 hover:underline">Refunds</Link>
          <Link href="/" className="text-sm text-blue-400 hover:underline">Portal</Link>
          <SignOutButton />
        </div>
      </header>

      <nav className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin?status=${t.key}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              t.key === status ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {error && <p className="text-red-400 text-sm">{error.message}</p>}
      {!error && applications.length === 0 && (
        <p className="text-gray-500 text-sm">Nothing here.</p>
      )}

      <ul className="space-y-4">
        {applications.map((a) => (
          <li key={a.id} className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
            <div className="flex items-start gap-4">
              {a.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-800" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{a.display_name}</p>
                <p className="text-sm text-gray-400">{a.title} · {a.email}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Submitted {fmt(a.submitted_at)} · Reviewed {fmt(a.reviewed_at)}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-gray-500 text-xs">License number</dt>
                <dd className="font-mono">{a.license_number || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">Price / timezone</dt>
                <dd>{(a.session_price_sek_ore / 100).toFixed(0)} SEK · {a.timezone}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">Languages</dt>
                <dd>{a.languages.join(', ') || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">Specialties</dt>
                <dd>{a.specialties.map((s) => (isSpecialty(s) ? SPECIALTY_LABELS[s] : s)).join(', ') || '—'}</dd>
              </div>
            </dl>

            {a.bio && <p className="text-sm text-gray-300 whitespace-pre-line">{a.bio}</p>}
            {a.rejection_reason && (
              <p className="text-sm text-red-300">Reason on file: {a.rejection_reason}</p>
            )}

            <p className="text-xs text-gray-500">
              Verify the license in Socialstyrelsen&apos;s register of licensed health professionals before approving.
            </p>
            <ReviewActions professionalId={a.id} status={a.status} />
          </li>
        ))}
      </ul>
    </main>
  );
}
