'use server';

import { isDateString } from '@/lib/dates';
import { createSupabaseServerClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export type ActionState = { error?: string; message?: string };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function done(message?: string): ActionState {
  revalidatePath('/availability');
  revalidatePath('/dashboard');
  return { message };
}

export async function createSlot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const date = formData.get('date');
  const time = String(formData.get('time') ?? '');
  if (!isDateString(date)) return { error: 'Choose a day.' };
  if (!TIME_RE.test(time)) return { error: 'Enter a start time (HH:MM).' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('create_slot', { p_date: date, p_time: time });
  if (error) return { error: error.message };
  return done(`Added ${time} slot.`);
}

export async function updateSlot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slotId = String(formData.get('slot_id') ?? '');
  const op = String(formData.get('op') ?? '');
  const supabase = await createSupabaseServerClient();

  const { error } =
    op === 'delete'
      ? await supabase.rpc('delete_slot', { p_slot_id: slotId })
      : op === 'block' || op === 'open'
        ? await supabase.rpc('set_slot_status', { p_slot_id: slotId, p_status: op === 'block' ? 'blocked' : 'open' })
        : { error: { message: 'Unknown action.' } };

  if (error) return { error: error.message };
  return done();
}

export async function generateSlots(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const from = formData.get('from');
  const weeks = Number(formData.get('weeks'));
  if (!isDateString(from) || ![1, 2, 4, 8, 12].includes(weeks)) return { error: 'Invalid range.' };

  const to = new Date(from + 'T00:00:00Z');
  to.setUTCDate(to.getUTCDate() + weeks * 7 - 1);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('generate_slots', {
    p_from: from,
    p_to: to.toISOString().slice(0, 10),
  });
  if (error) return { error: error.message };
  const created = Number(data ?? 0);
  return done(
    created === 0
      ? 'No new slots: your template is empty or those times are already covered.'
      : `Created ${created} slot${created === 1 ? '' : 's'}.`,
  );
}

export async function clearOpenSlots(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const from = formData.get('from');
  const to = formData.get('to');
  if (!isDateString(from) || !isDateString(to)) return { error: 'Invalid range.' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('clear_open_slots', { p_from: from, p_to: to });
  if (error) return { error: error.message };
  return done(`Removed ${Number(data ?? 0)} open slot(s). Booked and blocked slots were kept.`);
}

type Window = { day_of_week: number; start_time: string; end_time: string };

export async function saveTemplate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let windows: Window[];
  try {
    windows = JSON.parse(String(formData.get('windows') ?? '[]'));
  } catch {
    return { error: 'Invalid template.' };
  }
  if (!Array.isArray(windows) || windows.length > 50) return { error: 'Too many time ranges.' };

  for (const w of windows) {
    if (!Number.isInteger(w.day_of_week) || w.day_of_week < 0 || w.day_of_week > 6) return { error: 'Invalid day.' };
    if (!TIME_RE.test(w.start_time) || !TIME_RE.test(w.end_time)) return { error: 'Times must be HH:MM.' };
    if (w.end_time <= w.start_time) return { error: `A range ending at ${w.end_time} starts after it ends.` };
  }
  for (let day = 0; day <= 6; day++) {
    const sorted = windows.filter((w) => w.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start_time < sorted[i - 1].end_time) return { error: 'Time ranges on the same day overlap.' };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('replace_availability', {
    p_windows: windows.map((w) => ({ day_of_week: w.day_of_week, start_time: w.start_time, end_time: w.end_time })),
  });
  if (error) return { error: error.message };
  return done('Weekly hours saved. Generate slots to publish them.');
}
