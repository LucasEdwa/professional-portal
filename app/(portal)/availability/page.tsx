import { SESSION_DURATION_MINUTES } from '@/lib/constants';
import { addDays, formatDay, hhmm, isDateString, mondayOf } from '@/lib/dates';
import { dayKey } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/professional';
import { createSupabaseServerClient } from '@/lib/supabase';
import Link from 'next/link';
import SlotChip, { type Slot } from './SlotChip';
import { AddSlotForm, ClearWeekForm, GenerateForm } from './SlotTools';
import TemplateEditor from './TemplateEditor';

type SlotRow = {
  id: string;
  starts_at: string;
  status: Slot['status'];
  session_id: string | null;
  local_date: string;
  local_start: string;
  local_end: string;
  patient_nickname: string | null;
};

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('professional_profiles')
    .select('timezone, buffer_minutes, booking_notice_hours')
    .eq('id', user!.id)
    .single();

  const timeZone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const buffer = profile?.buffer_minutes ?? 15;
  const today = dayKey(new Date(), timeZone);
  const currentWeek = mondayOf(today);
  const week = isDateString(weekParam) && mondayOf(weekParam) >= currentWeek ? mondayOf(weekParam) : currentWeek;
  const weekEnd = addDays(week, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));

  const [slotsRes, templateRes] = await Promise.all([
    supabase.rpc('list_my_slots', { p_from: week, p_to: weekEnd }),
    supabase
      .from('professional_availability')
      .select('day_of_week, start_time, end_time')
      .eq('professional_id', user!.id)
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time'),
  ]);

  const now = Date.now();
  const slotsByDay = new Map<string, Slot[]>();
  for (const row of (slotsRes.data ?? []) as SlotRow[]) {
    const list = slotsByDay.get(row.local_date) ?? [];
    list.push({
      id: row.id,
      status: row.status,
      session_id: row.session_id,
      start: hhmm(row.local_start),
      end: hhmm(row.local_end),
      patient_nickname: row.patient_nickname,
      past: new Date(row.starts_at).getTime() < now,
    });
    slotsByDay.set(row.local_date, list);
  }

  const counts = { open: 0, booked: 0, blocked: 0 };
  slotsByDay.forEach((list) => list.forEach((s) => counts[s.status]++));

  const template = (templateRes.data ?? []).map((w) => ({
    day_of_week: w.day_of_week as number,
    start_time: hhmm(w.start_time as string),
    end_time: hhmm(w.end_time as string),
  }));

  const addableDays = days
    .filter((d) => d >= today)
    .map((d) => ({ value: d, label: formatDay(d, { weekday: 'long', day: 'numeric', month: 'short' }) }));

  return (
    <main className="px-6 py-8 max-w-6xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-white">Availability</h1>
        <p className="text-sm text-gray-400 mt-1">
          Sessions are {SESSION_DURATION_MINUTES} minutes with a {buffer}-minute break between them. Times are in{' '}
          {timeZone.replaceAll('_', ' ')}. App users can book open slots more than{' '}
          {profile?.booking_notice_hours ?? 12} hours ahead.{' '}
          <Link href="/settings" className="text-blue-400 hover:underline">Change</Link>
        </p>
      </div>

      {slotsRes.error && <p className="text-red-400 text-sm">Could not load slots: {slotsRes.error.message}</p>}

      {/* Week view */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {week > currentWeek ? (
              <Link href={`/availability?week=${addDays(week, -7)}`} className="px-2 py-1 rounded-lg text-gray-300 hover:bg-gray-800" aria-label="Previous week">←</Link>
            ) : (
              <span className="px-2 py-1 text-gray-700">←</span>
            )}
            <h2 className="text-sm font-semibold text-white">
              {formatDay(week, { day: 'numeric', month: 'short' })} – {formatDay(weekEnd, { day: 'numeric', month: 'short', year: 'numeric' })}
            </h2>
            <Link href={`/availability?week=${addDays(week, 7)}`} className="px-2 py-1 rounded-lg text-gray-300 hover:bg-gray-800" aria-label="Next week">→</Link>
            {week !== currentWeek && (
              <Link href="/availability" className="text-xs text-blue-400 hover:underline ml-2">This week</Link>
            )}
          </div>
          <p className="text-xs text-gray-500">
            <span className="text-green-400">{counts.open} open</span> ·{' '}
            <span className="text-blue-300">{counts.booked} booked</span> · {counts.blocked} blocked
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {days.map((d) => {
            const list = slotsByDay.get(d) ?? [];
            return (
              <div key={d} className={`rounded-xl border p-2 space-y-1.5 min-h-24 ${d === today ? 'border-blue-700/60' : 'border-gray-800'}`}>
                <p className={`text-xs font-medium px-1 ${d < today ? 'text-gray-600' : 'text-gray-300'}`}>
                  {formatDay(d, { weekday: 'short', day: 'numeric' })}
                </p>
                {list.length === 0 ? (
                  <p className="text-[11px] text-gray-700 px-1">No slots</p>
                ) : (
                  list.map((s) => <SlotChip key={s.id} slot={s} />)
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 rounded-xl bg-gray-900 border border-gray-800 p-4">
          <AddSlotForm days={addableDays} />
          {counts.open > 0 && <ClearWeekForm from={week} to={weekEnd} />}
        </div>
      </section>

      {/* Weekly template */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Weekly hours</h2>
          <p className="text-sm text-gray-400 mt-1">
            Set your usual working hours, then generate {SESSION_DURATION_MINUTES}-minute slots from them. Existing
            slots and bookings are never duplicated or changed.
          </p>
        </div>
        <TemplateEditor initial={template} slotMinutes={SESSION_DURATION_MINUTES + buffer} />
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
          <GenerateForm from={today} />
        </div>
      </section>
    </main>
  );
}
