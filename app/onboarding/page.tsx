import ProfileForm from '@/components/ProfileForm';
import SignOutButton from '@/components/SignOutButton';
import { getCurrentProfessional, supportedTimezones } from '@/lib/profile-query';
import { createSupabaseServerClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const { user, profile } = await getCurrentProfessional(supabase);
  if (!user) redirect('/login');

  const fullName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : undefined;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">HomeWithin Professional</p>
          <h1 className="text-2xl font-semibold mt-1">
            {profile?.status === 'rejected' ? 'Update your application' : 'Complete your application'}
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            Tell us about your practice. Our team verifies your license before your profile becomes
            visible to HomeWithin app users.
          </p>
        </div>
        <SignOutButton />
      </header>

      {profile?.rejection_reason && (profile.status === 'rejected' || profile.status === 'draft') && (
        <div className="rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          <p className="font-medium">Your previous application was not approved</p>
          <p className="mt-1 text-red-300/80">{profile.rejection_reason}</p>
        </div>
      )}

      <ProfileForm
        mode="onboarding"
        userId={user.id}
        profile={profile}
        defaultName={fullName}
        timezones={supportedTimezones()}
      />
    </main>
  );
}
