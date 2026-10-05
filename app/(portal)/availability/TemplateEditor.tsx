'use client';

import { useActionState, useState } from 'react';
import { saveTemplate, type ActionState } from './actions';

type Window = { day_of_week: number; start_time: string; end_time: string };

// Monday-first display order; values match JS getDay() / day_of_week.
const DAYS = [
  { dow: 1, label: 'Mon' },
  { dow: 2, label: 'Tue' },
  { dow: 3, label: 'Wed' },
  { dow: 4, label: 'Thu' },
  { dow: 5, label: 'Fri' },
  { dow: 6, label: 'Sat' },
  { dow: 0, label: 'Sun' },
];

const timeClass =
  'rounded-md bg-gray-900 border border-gray-700 px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function TemplateEditor({ initial, slotMinutes }: { initial: Window[]; slotMinutes: number }) {
  const [windows, setWindows] = useState<Window[]>(initial);
  const [state, action, pending] = useActionState<ActionState, FormData>(saveTemplate, {});

  function update(index: number, patch: Partial<Window>) {
    setWindows((prev) => prev.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  }

  function slotsIn(w: Window) {
    const [sh, sm] = w.start_time.split(':').map(Number);
    const [eh, em] = w.end_time.split(':').map(Number);
    const minutes = eh * 60 + em - (sh * 60 + sm);
    return minutes >= 45 ? Math.floor((minutes - 45) / slotMinutes) + 1 : 0;
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="windows" value={JSON.stringify(windows)} />
      <ul className="divide-y divide-gray-800 rounded-xl border border-gray-800">
        {DAYS.map(({ dow, label }) => {
          const rows = windows.map((w, i) => ({ w, i })).filter(({ w }) => w.day_of_week === dow);
          return (
            <li key={dow} className="flex flex-col sm:flex-row sm:items-start gap-2 px-4 py-3">
              <span className="w-12 shrink-0 text-sm font-medium text-gray-300 pt-1">{label}</span>
              <div className="flex-1 space-y-2">
                {rows.length === 0 && <p className="text-sm text-gray-600 pt-1">Unavailable</p>}
                {rows.map(({ w, i }) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input
                      type="time"
                      step={300}
                      value={w.start_time}
                      onChange={(e) => update(i, { start_time: e.target.value })}
                      className={timeClass}
                    />
                    <span className="text-gray-500">–</span>
                    <input
                      type="time"
                      step={300}
                      value={w.end_time}
                      onChange={(e) => update(i, { end_time: e.target.value })}
                      className={timeClass}
                    />
                    <span className="text-xs text-gray-500">{slotsIn(w)} slot{slotsIn(w) === 1 ? '' : 's'}</span>
                    <button
                      type="button"
                      onClick={() => setWindows((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setWindows((prev) => [...prev, { day_of_week: dow, start_time: '09:00', end_time: '17:00' }])}
                className="text-xs text-blue-400 hover:underline pt-1.5"
              >
                + Add hours
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium">
          {pending ? 'Saving…' : 'Save weekly hours'}
        </button>
        {state.error && <p className="text-xs text-red-400">{state.error}</p>}
        {state.message && <p className="text-xs text-green-400">{state.message}</p>}
      </div>
    </form>
  );
}
