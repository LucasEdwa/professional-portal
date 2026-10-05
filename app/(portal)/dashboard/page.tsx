import { createSupabaseServerClient } from '@/lib/supabase';
import StatusBadge from '@/components/StatusBadge';
import { dayKey, firstEmbed, formatSessionDate, hourIn } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/professional';
import Link from 'next/link';

function greeting(timeZone: string) {
  const h = hourIn(timeZone);
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [profileRes, upcomingRes, statsRes, openSlotsRes, unreadRes] = await Promise.all([
    supabase
      .from('professional_profiles')
      .select('display_name, title, timezone')
      .eq('id', user!.id)
      .single(),

    supabase
      .from('professional_sessions')
      .select('id, status, scheduled_at, user_profiles!user_id(nickname, avatar_url)')
      .eq('professional_id', user!.id)
      .in('status', ['confirmed', 'pending'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10),

    supabase
      .from('professional_sessions')
      .select('id, status, scheduled_at, user_id')
      .eq('professional_id', user!.id),

    supabase
      .from('professional_slots')
      .select('id', { count: 'exact', head: true })
      .eq('professional_id', user!.id)
      .eq('status', 'open')
      .gte('starts_at', new Date().toISOString()),

    supabase.rpc('session_unread_counts'),
  ]);
  const unreadRows = (unreadRes.data ?? []) as { session_id: string; unread: number }[];
  const unreadTotal = unreadRows.reduce((sum, r) => sum + r.unread, 0);
  const openSlots = openSlotsRes.count ?? 0;

  const name = profileRes.data?.display_name ?? user?.email?.split('@')[0] ?? 'there';
  const title = profileRes.data?.title;
  const timeZone = profileRes.data?.timezone ?? DEFAULT_TIMEZONE;
  const formatDate = (iso: string) => formatSessionDate(iso, timeZone);
  const sessions = upcomingRes.data ?? [];
  const allSessions = statsRes.data ?? [];

  const now = new Date();
  const todayStr = dayKey(now, timeZone);
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const todaySessions = sessions.filter(
    (s) => dayKey(s.scheduled_at, timeZone) === todayStr
  );
  const weekSessions = allSessions.filter(
    (s) =>
      ['confirmed', 'pending'].includes(s.status) &&
      new Date(s.scheduled_at) >= now &&
      new Date(s.scheduled_at) <= weekLater
  );
  const uniquePatients = new Set(allSessions.map((s) => s.user_id)).size;
  const totalCompleted = allSessions.filter((s) => s.status === 'completed').length;
  const totalPending = allSessions.filter((s) => s.status === 'pending').length;

  const stats = [
    {
      label: "Today's Sessions",
      value: todaySessions.length,
      sub: 'scheduled today',
      color: 'from-blue-600/20 to-blue-600/5',
      dot: 'bg-blue-400',
      icon: (
        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'This Week',
      value: weekSessions.length,
      sub: 'upcoming sessions',
      color: 'from-purple-600/20 to-purple-600/5',
      dot: 'bg-purple-400',
      icon: (
        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'Total Patients',
      value: uniquePatients,
      sub: 'unique clients',
      color: 'from-emerald-600/20 to-emerald-600/5',
      dot: 'bg-emerald-400',
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: 'Completed',
      value: totalCompleted,
      sub: 'sessions total',
      color: 'from-amber-600/20 to-amber-600/5',
      dot: 'bg-amber-400',
      icon: (
        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <main className="px-6 py-8 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">
          {greeting(timeZone)}, {name} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {title && <span className="mr-1">{title} · </span>}
          {new Date().toLocaleDateString('en-SE', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone,
          })}
        </p>
      </div>

      {unreadTotal > 0 && (
        <Link
          href={unreadRows.length === 1 ? `/sessions/${unreadRows[0].session_id}` : '/sessions'}
          className="flex items-center justify-between gap-4 rounded-xl border border-blue-700/50 bg-blue-900/20 px-4 py-3.5 hover:border-blue-500/60 transition-colors"
        >
          <p className="text-sm font-medium text-blue-200">
            {unreadTotal} unread message{unreadTotal === 1 ? '' : 's'} from clients
          </p>
          <span className="text-sm text-blue-300 shrink-0">Read →</span>
        </Link>
      )}

      {openSlots === 0 && (
        <Link
          href="/availability"
          className="flex items-center justify-between gap-4 rounded-xl border border-amber-700/50 bg-amber-900/20 px-4 py-3.5 hover:border-amber-500/60 transition-colors"
        >
          <div>
            <p className="text-sm font-medium text-amber-300">You have no open slots</p>
            <p className="text-xs text-amber-200/70 mt-0.5">App users can only book you once you publish 45-minute slots.</p>
          </div>
          <span className="text-sm text-amber-300 shrink-0">Set availability →</span>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-xl bg-gradient-to-br ${s.color} border border-gray-800 p-4 space-y-2`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
              {s.icon}
            </div>
            <p className="text-3xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-500">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Today */}
      {todaySessions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            Today
          </h2>
          <div className="space-y-2">
            {todaySessions.map((s) => {
              const profile = firstEmbed(s.user_profiles as { nickname?: string; avatar_url?: string } | { nickname?: string; avatar_url?: string }[] | null);
              return (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="flex items-center justify-between rounded-xl bg-blue-600/10 border border-blue-800/40 px-4 py-3.5 hover:border-blue-600/60 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-300 text-sm font-semibold shrink-0">
                      {(profile?.nickname ?? 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
                        {profile?.nickname ?? 'Anonymous'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.scheduled_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s.status} />
                    <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />
            Upcoming Sessions
          </h2>
          <Link href="/sessions" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            View all →
          </Link>
        </div>

        {sessions.filter((s) => dayKey(s.scheduled_at, timeZone) !== todayStr).length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 px-6 py-10 text-center">
            <svg className="w-10 h-10 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 text-sm">No upcoming sessions scheduled.</p>
            <p className="text-gray-600 text-xs mt-1">Sessions booked by clients will appear here.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sessions
              .filter((s) => dayKey(s.scheduled_at, timeZone) !== todayStr)
              .map((s) => {
                const profile = firstEmbed(s.user_profiles as { nickname?: string; avatar_url?: string } | { nickname?: string; avatar_url?: string }[] | null);
                return (
                  <li key={s.id}>
                    <Link
                      href={`/sessions/${s.id}`}
                      className="flex items-center justify-between rounded-xl bg-gray-900 border border-gray-800 px-4 py-3 hover:border-gray-600 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-sm font-semibold shrink-0">
                          {(profile?.nickname ?? 'A').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
                            {profile?.nickname ?? 'Anonymous'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.scheduled_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={s.status} />
                        <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/patients"
            className="flex items-center gap-3 rounded-xl bg-gray-900 border border-gray-800 px-4 py-3.5 hover:border-gray-600 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">View Patients</p>
              <p className="text-xs text-gray-500">{uniquePatients} total</p>
            </div>
          </Link>

          <Link
            href="/sessions"
            className="flex items-center gap-3 rounded-xl bg-gray-900 border border-gray-800 px-4 py-3.5 hover:border-gray-600 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">All Sessions</p>
              <p className="text-xs text-gray-500">{totalCompleted} completed</p>
            </div>
          </Link>

          <Link
            href="/sessions?filter=pending"
            className="flex items-center gap-3 rounded-xl bg-gray-900 border border-gray-800 px-4 py-3.5 hover:border-gray-600 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-yellow-600/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">Pending Requests</p>
              <p className="text-xs text-gray-500">{totalPending} awaiting</p>
            </div>
          </Link>
        </div>
      </section>

    </main>
  );
}
