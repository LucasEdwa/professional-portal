'use client';

import SignOutButton from '@/components/SignOutButton';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Enrollment = { factorId: string; qrCode: string; secret: string };

export default function MfaSetupPage() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    (async () => {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp.some((f) => f.status === 'verified')) {
        router.replace('/mfa/verify');
        return;
      }
      // Remove abandoned, unverified enrolments so a new one can be created.
      for (const f of factors?.all ?? []) {
        if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
      });
      if (enrollError || !data) {
        setError(enrollError?.message ?? 'Could not start setup.');
        return;
      }
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    })();
  }, [router]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollment) return;
    setVerifying(true);
    setError(null);
    const { error: verifyError } = await createSupabaseBrowserClient().auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code: code.replace(/\s/g, ''),
    });
    setVerifying(false);
    if (verifyError) {
      setError('That code did not work. Check the time on your phone and try the newest code.');
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider">HomeWithin Professional</p>
          <h1 className="text-xl font-semibold mt-1">Set up two-factor authentication</h1>
          <p className="text-sm text-gray-400 mt-2">
            Client records require a second sign-in step. Scan the code with an authenticator app
            (Google Authenticator, Microsoft Authenticator, 1Password…), then enter the 6-digit code.
          </p>
        </div>

        {enrollment ? (
          <>
            <div className="rounded-xl bg-white p-4 mx-auto w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrollment.qrCode} alt="Authenticator QR code" className="w-48 h-48" />
            </div>
            <p className="text-xs text-gray-500 text-center break-all">
              Can&apos;t scan? Enter this key: <span className="font-mono text-gray-300">{enrollment.secret}</span>
            </p>
            <form onSubmit={verify} className="space-y-3">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123 456"
                className="w-full text-center tracking-widest text-lg rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button
                disabled={verifying}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium"
              >
                {verifying ? 'Verifying…' : 'Turn on two-factor authentication'}
              </button>
            </form>
          </>
        ) : error ? (
          <p className="text-red-400 text-sm text-center">{error}</p>
        ) : (
          <p className="text-gray-400 text-sm text-center">Preparing…</p>
        )}

        <div className="text-center">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
