import { createSupabaseServerClient } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function PatientPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verify this professional has at least one session with this patient
  const { data: check } = await supabase
    .from('professional_sessions')
    .select('id')
    .eq('professional_id', user!.id)
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (!check) notFound();

  const [{ data: profile }, { data: sessions }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('nickname, avatar_url, needs, age_range')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('professional_sessions')
      .select('id, scheduled_at, status, session_notes(body, is_shared_with_ai)')
      .eq('professional_id', user!.id)
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: false }),
  ]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/patients" className="text-sm text-blue-400 hover:underline">
          ← Patients
        </Link>
      </div>

      <div className="rounded-xl bg-gray-900 border border-gray-800 px-5 py-4">
        <p className="font-semibold">{profile?.nickname ?? 'Anonymous'}</p>
        {profile?.age_range && (
          <p className="text-xs text-gray-400 mt-1">Age range: {profile.age_range}</p>
        )}
        {(profile?.needs as string[] | null)?.length ? (
          <div className="flex flex-wrap gap-1 mt-2">
            {(profile!.needs as string[]).map((n) => (
              <span key={n} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">
                {n}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <section>
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
          Session History
        </h2>
        <ul className="space-y-2">
          {(sessions ?? []).map((s: Record<string, unknown>) => {
            const note = (s.session_notes as Record<string, unknown>[] | null)?.[0];
            return (
              <li key={s.id as string}>
                <Link
                  href={`/sessions/${s.id}`}
                  className="flex items-center justify-between rounded-xl bg-gray-900 border border-gray-800 px-4 py-3 hover:border-gray-600 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(s.scheduled_at as string).toLocaleDateString('en-SE', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    {note?.body ? (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                        {note.body as string}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600 mt-0.5">No notes yet</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{s.status as string}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
