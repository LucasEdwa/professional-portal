'use client';

import SignOutButton from '@/components/SignOutButton';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MfaVerifyPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    createSupabaseBrowserClient()
      .auth.mfa.listFactors()
      .then(({ data }) => {
        const factor = data?.totp.find((f) => f.status === 'verified');
        if (!factor) router.replace('/mfa/setup');
        else setFactorId(factor.id);
      });
  }, [router]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setVerifying(true);
    setError(null);
    const { error: verifyError } = await createSupabaseBrowserClient().auth.mfa.challengeAndVerify({
      factorId,
      code: code.replace(/\s/g, ''),
    });
    setVerifying(false);
    if (verifyError) {
      setError('That code did not work. Try the newest code from your authenticator app.');
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider">HomeWithin Professional</p>
          <h1 className="text-xl font-semibold mt-1">Enter your authentication code</h1>
          <p className="text-sm text-gray-400 mt-2">Open your authenticator app and enter the 6-digit code.</p>
        </div>
        <form onSubmit={verify} className="space-y-3">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={7}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123 456"
            className="w-full text-center tracking-widest text-lg rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            disabled={verifying || !factorId}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium"
          >
            {verifying ? 'Verifying…' : 'Verify'}
          </button>
        </form>
        <p className="text-xs text-gray-500 text-center">
          Lost your phone? Contact support@homewithin.app to reset two-factor authentication.
        </p>
        <div className="text-center">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
