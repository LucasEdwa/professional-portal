import StatusBadge from '@/components/StatusBadge';
import { firstEmbed, formatSessionDate } from '@/lib/format';
import { createSupabaseServerClient } from '@/lib/supabase';
import { DEFAULT_TIMEZONE } from '@/lib/professional';
import Link from 'next/link';

const FILTERS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'pending', label: 'Pending' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

function isFilterKey(value: string | undefined): value is FilterKey {
  return FILTERS.some((f) => f.key === value);
}

type PatientEmbed = { nickname?: string } | null;

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter: FilterKey = isFilterKey(rawFilter) ? rawFilter : 'upcoming';

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const nowIso = new Date().toISOString();

  const { data: me } = await supabase
    .from('professional_profiles')
    .select('timezone')
    .eq('id', user!.id)
    .single();
  const timeZone = me?.timezone ?? DEFAULT_TIMEZONE;

  let query = supabase
    .from('professional_sessions')
    .select('id, status, scheduled_at, duration_minutes, user_profiles!user_id(nickname)')
    .eq('professional_id', user!.id);

  switch (filter) {
    case 'upcoming':
      query = query
        .in('status', ['confirmed', 'pending'])
        .gte('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: true });
      break;
    case 'pending':
      query = query
        .eq('status', 'pending')
        .gte('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: true });
      break;
    case 'past':
      query = query
        .neq('status', 'cancelled')
        .lt('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: false });
      break;
    case 'cancelled':
      query = query
        .eq('status', 'cancelled')
        .order('scheduled_at', { ascending: false });
      break;
  }

  const { data: sessions, error } = await query.limit(100);

  return (
    <main className="px-6 py-8 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-white">Sessions</h1>

      <nav className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/sessions?filter=${f.key}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              f.key === filter
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="text-red-400 text-sm">Could not load sessions: {error.message}</p>
      ) : !sessions?.length ? (
        <div className="rounded-xl border border-dashed border-gray-700 px-6 py-10 text-center">
          <p className="text-gray-500 text-sm">No {filter} sessions.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const patient = firstEmbed(s.user_profiles as PatientEmbed | PatientEmbed[]);
            return (
              <li key={s.id}>
                <Link
                  href={`/sessions/${s.id}`}
                  className="flex items-center justify-between rounded-xl bg-gray-900 border border-gray-800 px-4 py-3 hover:border-gray-600 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-sm font-semibold shrink-0">
                      {(patient?.nickname ?? 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
                        {patient?.nickname ?? 'Anonymous'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatSessionDate(s.scheduled_at, timeZone)} · {s.duration_minutes} min
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
