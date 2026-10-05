import Sidebar from '@/components/Sidebar';
import { createSupabaseServerClient } from '@/lib/supabase';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('professional_profiles')
    .select('display_name, title')
    .eq('id', user!.id)
    .single();

  const name = profile?.display_name ?? user?.email?.split('@')[0] ?? 'Professional';
  const title = profile?.title ?? undefined;

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar name={name} title={title} />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
