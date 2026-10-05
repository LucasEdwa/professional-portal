import { createSupabaseServerClient } from '@/lib/supabase';
import Link from 'next/link';

export default async function PatientsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Distinct users who have had at least one session with this professional
  const { data: sessions } = await supabase
    .from('professional_sessions')
    .select('user_id, user_profiles!user_id(nickname, avatar_url)')
    .eq('professional_id', user!.id)
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: false });

  // Deduplicate by user_id
  const seen = new Set<string>();
  const patients = (sessions ?? []).filter((s: Record<string, unknown>) => {
    if (seen.has(s.user_id as string)) return false;
    seen.add(s.user_id as string);
    return true;
  });

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Patients</h1>
        <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">
          ← Dashboard
        </Link>
      </div>

      {patients.length > 0 ? (
        <ul className="space-y-2">
          {patients.map((s: Record<string, unknown>) => {
            const profile = s.user_profiles as Record<string, unknown> | null;
            return (
              <li key={s.user_id as string}>
                <Link
                  href={`/patients/${s.user_id}`}
                  className="flex items-center gap-3 rounded-xl bg-gray-900 border border-gray-800 px-4 py-3 hover:border-gray-600 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-300">
                    {((profile?.nickname as string) ?? '?')[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">
                    {(profile?.nickname as string) ?? 'Anonymous'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-gray-500 text-sm">No patients yet.</p>
      )}
    </main>
  );
}
