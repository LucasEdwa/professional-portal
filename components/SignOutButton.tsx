'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export default function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleLogout() {
    await createSupabaseBrowserClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className={className ?? 'text-sm text-gray-400 hover:text-white'}>
      Sign out
    </button>
  );
}
