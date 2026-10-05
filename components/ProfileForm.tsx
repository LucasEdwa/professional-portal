'use client';

import { saveProfessionalProfile, type ProfileFormState } from '@/lib/profile-actions';
import {
  DEFAULT_TIMEZONE,
  SPECIALTY_LABELS,
  type ProfessionalProfileRow,
  type ProfessionalStatus,
  type Specialty,
} from '@/lib/professional';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { startTransition, useActionState, useState } from 'react';

const inputClass =
  'w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

type Props = {
  mode: 'onboarding' | 'settings';
  userId: string;
  profile: Partial<ProfessionalProfileRow> | null;
  defaultName?: string;
  timezones: string[];
};

export default function ProfileForm({ mode, userId, profile, defaultName, timezones }: Props) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    saveProfessionalProfile,
    {},
  );
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [bioLength, setBioLength] = useState(profile?.bio?.length ?? 0);

  const status = (profile?.status ?? null) as ProfessionalStatus | null;
  const selected = new Set(profile?.specialties ?? []);
  const fe = state.fieldErrors ?? {};

  // Dispatch manually instead of <form action>: React 19 resets uncontrolled
  // fields after a form action, which would wipe input on validation errors.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(e.currentTarget, submitter);
    startTransition(() => formAction(formData));
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setUploadError('Image must be 2 MB or smaller.');
      return;
    }
    setUploading(true);
    const supabase = createSupabaseBrowserClient();
    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${userId}/professional-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: file.type, upsert: true });
    setUploading(false);
    if (error) {
      setUploadError(error.message);
      return;
    }
    setAvatarUrl(supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Section title="Identity">
        <Field label="Full name *" error={fe.display_name}>
          <input
            name="display_name"
            required
            maxLength={100}
            defaultValue={profile?.display_name ?? defaultName ?? ''}
            placeholder="Dr. Alex Johansson"
            className={inputClass}
          />
        </Field>
        <Field label="Professional title *" error={fe.title}>
          <input
            name="title"
            required
            maxLength={100}
            defaultValue={profile?.title ?? ''}
            placeholder="Licensed Psychologist"
            className={inputClass}
          />
        </Field>
        <Field label="Photo" error={fe.avatar_url ?? uploadError ?? undefined}>
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover border border-gray-700" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-800 border border-gray-700" />
            )}
            <label className="text-sm text-blue-400 hover:underline cursor-pointer">
              {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
              <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" disabled={uploading} />
            </label>
          </div>
          <input type="hidden" name="avatar_url" value={avatarUrl} />
        </Field>
      </Section>

      <Section title="Credentials">
        <Field
          label="License (legitimation) number *"
          error={fe.license_number}
          hint={
            mode === 'settings'
              ? 'Changing your license number sends your profile back to review and hides it from the app until re-approved.'
              : 'We verify this against the Socialstyrelsen register before your profile goes live.'
          }
        >
          <input
            name="license_number"
            maxLength={50}
            defaultValue={profile?.license_number ?? ''}
            placeholder="SE-1234567"
            className={`${inputClass} uppercase`}
          />
        </Field>
      </Section>

      <Section title="Public profile">
        <Field label="Bio *" error={fe.bio} hint={`${bioLength}/2000 · shown to app users`}>
          <textarea
            name="bio"
            rows={6}
            maxLength={2000}
            defaultValue={profile?.bio ?? ''}
            onChange={(e) => setBioLength(e.target.value.length)}
            placeholder="Your background, approach, and who you work with…"
            className={`${inputClass} resize-y`}
          />
        </Field>
        <Field label="Specialties *" error={fe.specialties}>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SPECIALTY_LABELS) as Specialty[]).map((s) => (
              <label key={s} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="specialties"
                  value={s}
                  defaultChecked={selected.has(s)}
                  className="peer sr-only"
                />
                <span className="inline-block text-xs px-3 py-1.5 rounded-full border border-gray-700 text-gray-400 peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 transition-colors">
                  {SPECIALTY_LABELS[s]}
                </span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="Languages *" error={fe.languages} hint="Comma-separated, e.g. Swedish, English">
          <input
            name="languages"
            defaultValue={(profile?.languages ?? []).join(', ')}
            placeholder="Swedish, English"
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="Practice settings">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Session price (SEK)" error={fe.price_sek} hint="45 min. 0 = free">
            <input
              name="price_sek"
              type="number"
              min={0}
              step={1}
              defaultValue={((profile?.session_price_sek_ore ?? 0) / 100).toString()}
              className={inputClass}
            />
          </Field>
          <Field label="Timezone" error={fe.timezone}>
            <select
              name="timezone"
              defaultValue={profile?.timezone ?? DEFAULT_TIMEZONE}
              className={inputClass}
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Break between sessions" error={fe.buffer_minutes} hint="Minutes">
            <input
              name="buffer_minutes"
              type="number"
              min={0}
              max={120}
              step={5}
              defaultValue={(profile?.buffer_minutes ?? 15).toString()}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      {state.error && <p className="text-red-400 text-sm">{state.error}</p>}
      {state.saved && !state.error && <p className="text-green-400 text-sm">Saved ✓</p>}

      <div className="flex flex-col sm:flex-row gap-3">
        {mode === 'settings' ? (
          <SubmitButton intent="save" disabled={pending || uploading} primary>
            {pending ? 'Saving…' : 'Save changes'}
          </SubmitButton>
        ) : (
          <>
            <SubmitButton intent="submit" disabled={pending || uploading} primary>
              {pending ? 'Saving…' : status === 'pending_review' ? 'Update application' : 'Submit for review'}
            </SubmitButton>
            {status !== 'pending_review' && (
              <SubmitButton intent="draft" disabled={pending || uploading}>
                Save draft
              </SubmitButton>
            )}
          </>
        )}
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm text-gray-300">{label}</p>
      {children}
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

function SubmitButton({
  intent,
  disabled,
  primary,
  children,
}: {
  intent: string;
  disabled: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={disabled}
      className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
        primary ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
