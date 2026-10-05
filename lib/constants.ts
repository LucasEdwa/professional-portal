/** Shared constants used by both server and client components in the portal. */

/** Length of every bookable session. Mirrors SESSION_DURATION_MINUTES in the mobile app. */
export const SESSION_DURATION_MINUTES = 45;

/** Video call join window; enforced by the create-call-token Edge Function (keep in sync). */
export const VIDEO_JOIN_OPENS_MINUTES_BEFORE = 15;
export const VIDEO_JOIN_CLOSES_MINUTES_AFTER = 30;
