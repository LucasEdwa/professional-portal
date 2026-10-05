import SignOutButton from '@/components/SignOutButton';
import { getCurrentProfessional } from '@/lib/profile-query';
import { createSupabaseServerClient } from '@/lib/supabase';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function PendingPage() {
  const supabase = await createSupabaseServerClient();
  const { user, profile } = await getCurrentProfessional(supabase);
  if (!user) redirect('/login');
  if (!profile) redirect('/onboarding');

  const content = {
    pending_review: {
      title: 'Your application is under review',
      body: 'We are verifying your license. This usually takes 1–3 business days. We will email you when your profile is approved.',
      tone: 'text-yellow-400',
    },
    rejected: {
      title: 'Your application was not approved',
      body: profile.rejection_reason ?? 'Please review your details and resubmit.',
      tone: 'text-red-400',
    },
    suspended: {
      title: 'Your account is suspended',
      body: 'Your profile is hidden from the app. Please contact support@homewithin.app.',
      tone: 'text-red-400',
    },
  }[profile.status as 'pending_review' | 'rejected' | 'suspended'];

  if (!content) redirect('/');

  const submitted = profile.submitted_at
    ? new Date(profile.submitted_at).toLocaleDateString('en-SE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: profile.timezone,
      })
    : null;

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <p className="text-xs text-gray-500 uppercase tracking-wider">HomeWithin Professional</p>
        <h1 className={`text-xl font-semibold ${content.tone}`}>{content.title}</h1>
        <p className="text-sm text-gray-400">{content.body}</p>
        {submitted && profile.status === 'pending_review' && (
          <p className="text-xs text-gray-500">Submitted {submitted}</p>
        )}
        <div className="flex items-center justify-center gap-6 pt-2">
          {profile.status !== 'suspended' && (
            <Link href="/onboarding" className="text-sm text-blue-400 hover:underline">
              {profile.status === 'rejected' ? 'Edit & resubmit' : 'Edit application'}
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
