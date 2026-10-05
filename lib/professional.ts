/** Mirrors `Specialty` / `SPECIALTY_LABELS` in Homewithin/types/professional.ts. */
export const SPECIALTY_LABELS = {
  family_rejection: 'Family Rejection',
  coming_out: 'Coming Out',
  trans_identity: 'Trans Identity',
  grief: 'Grief & Loss',
  anxiety: 'Anxiety',
  internalized_shame: 'Internalized Shame',
  religious_trauma: 'Religious Trauma',
  relationships: 'Relationships',
  general: 'General Support',
  therapist: 'Therapist',
  coach: 'Coach',
  social_worker: 'Social Worker',
  counselor: 'Counselor',
  psychiatrist: 'Psychiatrist',
  mentor: 'Mentor',
} as const;

export type Specialty = keyof typeof SPECIALTY_LABELS;

export function isSpecialty(value: string): value is Specialty {
  return Object.prototype.hasOwnProperty.call(SPECIALTY_LABELS, value);
}

export type ProfessionalStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'suspended';

export interface ProfessionalProfileRow {
  id: string;
  display_name: string;
  title: string;
  bio: string;
  specialties: string[];
  languages: string[];
  license_number: string;
  license_verified: boolean;
  avatar_url: string | null;
  session_price_sek_ore: number;
  is_active: boolean;
  status: ProfessionalStatus;
  timezone: string;
  buffer_minutes: number;
  booking_notice_hours: number;
  stripe_payouts_enabled: boolean;
  rejection_reason: string | null;
  submitted_at: string | null;
}

export const DEFAULT_TIMEZONE = 'Europe/Stockholm';

/** Where a signed-in user belongs given their application status (null = no profile yet). */
export function homePathFor(status: ProfessionalStatus | null): string {
  switch (status) {
    case 'approved':
      return '/dashboard';
    case 'pending_review':
    case 'rejected':
    case 'suspended':
      return '/pending';
    default:
      return '/onboarding';
  }
}

/** Whether a signed-in user with this status may open `pathname`. */
export function canAccess(status: ProfessionalStatus | null, pathname: string): boolean {
  const under = (prefix: string) => pathname === prefix || pathname.startsWith(prefix + '/');

  switch (status) {
    case 'approved':
      return !under('/onboarding') && !under('/pending');
    case 'pending_review':
    case 'rejected':
      return under('/onboarding') || under('/pending');
    case 'suspended':
      return under('/pending');
    default:
      return under('/onboarding');
  }
}
