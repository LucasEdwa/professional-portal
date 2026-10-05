import ProfileForm from '@/components/ProfileForm';
import { getCurrentProfessional, supportedTimezones } from '@/lib/profile-query';
import { createSupabaseServerClient } from '@/lib/supabase';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { user, profile } = await getCurrentProfessional(supabase);
  if (!user || !profile) redirect('/');

  return (
    <main className="px-6 py-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">
          Your public profile as app users see it, and your practice settings.
        </p>
      </div>

      <ProfileForm mode="settings" userId={user.id} profile={profile} timezones={supportedTimezones()} />

      <section className="space-y-2 border-t border-gray-800 pt-6">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Security</h2>
        <p className="text-sm text-gray-400">Signed in as {user.email}</p>
        <Link href="/auth/update-password" className="text-sm text-blue-400 hover:underline">
          Change password
        </Link>
      </section>
    </main>
  );
}
