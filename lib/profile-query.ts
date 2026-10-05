import type { ProfessionalProfileRow } from '@/lib/professional';
import type { createSupabaseServerClient } from '@/lib/supabase';

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export const PROFILE_COLUMNS =
  'id, display_name, title, bio, specialties, languages, license_number, license_verified, avatar_url, session_price_sek_ore, is_active, status, timezone, buffer_minutes, booking_notice_hours, stripe_payouts_enabled, rejection_reason, submitted_at';

/** The signed-in user and their professional profile (null if they have not started one). */
export async function getCurrentProfessional(supabase: ServerClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data } = await supabase
    .from('professional_profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', user.id)
    .maybeSingle();

  return { user, profile: (data as ProfessionalProfileRow | null) ?? null };
}

export function supportedTimezones(): string[] {
  return Intl.supportedValuesOf('timeZone');
}
