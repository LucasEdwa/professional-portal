'use client';

import { useActionState } from 'react';
import { clearOpenSlots, createSlot, generateSlots, type ActionState } from './actions';

const fieldClass =
  'rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-xs text-red-400">{state.error}</p>;
  if (state.message) return <p className="text-xs text-green-400">{state.message}</p>;
  return null;
}

export function AddSlotForm({ days }: { days: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createSlot, {});
  if (days.length === 0) return null;

  return (
    <form action={action} className="space-y-2">
      <p className="text-sm font-medium text-gray-300">Add a single 45-min slot</p>
      <div className="flex flex-wrap gap-2">
        <select name="date" className={fieldClass} defaultValue={days[0].value}>
          {days.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        <input name="time" type="time" step={300} defaultValue="09:00" required className={fieldClass} />
        <button disabled={pending} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium">
          {pending ? 'Adding…' : 'Add slot'}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function ClearWeekForm({ from, to }: { from: string; to: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(clearOpenSlots, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm('Remove all open slots in this week? Booked and blocked slots are kept.')) e.preventDefault();
      }}
      className="space-y-1"
    >
      <input type="hidden" name="from" value={from} />
      <input type="hidden" name="to" value={to} />
      <button disabled={pending} className="text-sm text-red-400 hover:underline disabled:opacity-50">
        Clear open slots this week
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function GenerateForm({ from }: { from: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(generateSlots, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="from" value={from} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-300">Publish slots from these hours for the next</span>
        <select name="weeks" defaultValue="4" className={fieldClass}>
          {[1, 2, 4, 8, 12].map((w) => (
            <option key={w} value={w}>{w} week{w === 1 ? '' : 's'}</option>
          ))}
        </select>
        <button disabled={pending} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-sm font-medium">
          {pending ? 'Generating…' : 'Generate slots'}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
