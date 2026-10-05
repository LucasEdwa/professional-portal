'use server';

import { isSpecialty, type ProfessionalStatus } from '@/lib/professional';
import { createSupabaseServerClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ProfileFormState = {
  error?: string;
  fieldErrors?: Partial<Record<ProfileField, string>>;
  saved?: boolean;
};

type ProfileField =
  | 'display_name'
  | 'title'
  | 'license_number'
  | 'bio'
  | 'specialties'
  | 'languages'
  | 'price_sek'
  | 'timezone'
  | 'buffer_minutes'
  | 'booking_notice_hours'
  | 'avatar_url';

/** 'draft' = save without submitting, 'submit' = send for review, 'save' = edit an approved profile. */
type Intent = 'draft' | 'submit' | 'save';

const MAX_PRICE_SEK = 10_000;
const MIN_PAID_PRICE_SEK = 50;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function saveProfessionalProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Your session has expired. Please sign in again.' };

  const rawIntent = text(formData, 'intent');
  const intent: Intent = rawIntent === 'submit' || rawIntent === 'save' ? rawIntent : 'draft';

  const displayName = text(formData, 'display_name');
  const title = text(formData, 'title');
  const licenseNumber = text(formData, 'license_number').toUpperCase();
  const bio = text(formData, 'bio');
  const specialties = formData.getAll('specialties').map(String).filter(isSpecialty);
  const languages = [
    ...new Set(
      text(formData, 'languages')
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean),
    ),
  ];
  const priceRaw = text(formData, 'price_sek');
  const price = priceRaw === '' ? 0 : Number(priceRaw.replace(',', '.'));
  const timezone = text(formData, 'timezone');
  const bufferMinutes = Number(text(formData, 'buffer_minutes') || '15');
  const noticeHours = Number(text(formData, 'booking_notice_hours') || '12');
  const avatarUrl = text(formData, 'avatar_url');

  const fieldErrors: ProfileFormState['fieldErrors'] = {};
  const requireAll = intent !== 'draft';

  if (!displayName) fieldErrors.display_name = 'Your name is required.';
  else if (displayName.length > 100) fieldErrors.display_name = 'Max 100 characters.';

  if (!title) fieldErrors.title = 'Your professional title is required.';
  else if (title.length > 100) fieldErrors.title = 'Max 100 characters.';

  if (requireAll && !licenseNumber) fieldErrors.license_number = 'Your license number is required.';
  else if (licenseNumber.length > 50) fieldErrors.license_number = 'Max 50 characters.';

  if (bio.length > 2000) fieldErrors.bio = 'Max 2000 characters.';
  else if (requireAll && bio.length < 50) fieldErrors.bio = 'Please write at least 50 characters.';

  if (requireAll && specialties.length === 0) fieldErrors.specialties = 'Select at least one specialty.';

  if (languages.length > 10 || languages.some((l) => l.length > 40)) {
    fieldErrors.languages = 'Up to 10 languages, 40 characters each.';
  } else if (requireAll && languages.length === 0) {
    fieldErrors.languages = 'Add at least one language.';
  }

  if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE_SEK || (price > 0 && price < MIN_PAID_PRICE_SEK)) {
    fieldErrors.price_sek = `Enter 0 (free) or a price between ${MIN_PAID_PRICE_SEK} and ${MAX_PRICE_SEK} SEK.`;
  }

  if (!Intl.supportedValuesOf('timeZone').includes(timezone)) {
    fieldErrors.timezone = 'Choose a valid timezone.';
  }

  if (!Number.isInteger(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 120) {
    fieldErrors.buffer_minutes = 'Buffer must be 0–120 minutes.';
  }

  if (!Number.isInteger(noticeHours) || noticeHours < 0 || noticeHours > 168) {
    fieldErrors.booking_notice_hours = 'Notice must be 0–168 hours.';
  }

  const ownAvatarPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/`;
  if (avatarUrl && !avatarUrl.startsWith(ownAvatarPrefix)) {
    fieldErrors.avatar_url = 'Invalid photo. Please upload it again.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: 'Please fix the highlighted fields.', fieldErrors };
  }

  const fields = {
    display_name: displayName,
    title,
    license_number: licenseNumber,
    bio,
    specialties,
    languages,
    session_price_sek_ore: Math.round(price * 100),
    timezone,
    buffer_minutes: bufferMinutes,
    booking_notice_hours: noticeHours,
    avatar_url: avatarUrl || null,
  };

  const { data: existing } = await supabase
    .from('professional_profiles')
    .select('status')
    .eq('id', user.id)
    .maybeSingle();
  const currentStatus = (existing?.status ?? null) as ProfessionalStatus | null;

  // Approved/suspended professionals never change their own status here; the
  // DB trigger sends them back to review if the license number changes.
  let nextStatus: ProfessionalStatus | undefined;
  if (currentStatus !== 'approved' && currentStatus !== 'suspended') {
    nextStatus = intent === 'submit' || currentStatus === 'pending_review' ? 'pending_review' : 'draft';
  }

  // Update-or-insert (not upsert): the BEFORE INSERT guard trigger would also
  // fire on an upsert's conflict path and reject existing approved rows.
  const { error } = existing
    ? await supabase
        .from('professional_profiles')
        .update({ ...fields, ...(nextStatus ? { status: nextStatus } : {}) })
        .eq('id', user.id)
    : await supabase
        .from('professional_profiles')
        .insert({ id: user.id, ...fields, status: nextStatus ?? 'draft' });

  if (error) return { error: error.message };

  revalidatePath('/', 'layout');

  const { data: after } = await supabase
    .from('professional_profiles')
    .select('status')
    .eq('id', user.id)
    .single();

  if (after?.status === 'pending_review' && (intent === 'submit' || currentStatus === 'approved')) {
    redirect('/pending');
  }

  return { saved: true };
}
