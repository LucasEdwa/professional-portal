'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { updateSlot, type ActionState } from './actions';

export type Slot = {
  id: string;
  status: 'open' | 'booked' | 'blocked';
  session_id: string | null;
  start: string; // HH:MM local
  end: string;
  patient_nickname: string | null;
  past: boolean;
};

const STYLES: Record<Slot['status'], string> = {
  open: 'border-green-700/60 bg-green-900/20 text-green-300',
  booked: 'border-blue-700/60 bg-blue-900/30 text-blue-200',
  blocked: 'border-gray-700 bg-gray-800/60 text-gray-500 line-through',
};

export default function SlotChip({ slot }: { slot: Slot }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateSlot, {});
  const base = `block w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium text-left ${STYLES[slot.status]} ${
    slot.past ? 'opacity-50' : ''
  }`;

  if (slot.status === 'booked' && slot.session_id) {
    return (
      <Link href={`/sessions/${slot.session_id}`} className={`${base} hover:border-blue-500`}>
        {slot.start}–{slot.end}
        <span className="block font-normal text-blue-300/80 truncate">{slot.patient_nickname ?? 'Booked'}</span>
      </Link>
    );
  }

  return (
    <details className="group">
      <summary className={`${base} cursor-pointer list-none hover:brightness-125`}>
        {slot.start}–{slot.end}
        <span className="block font-normal opacity-70">{slot.status === 'open' ? 'Open' : 'Blocked'}</span>
      </summary>
      <form action={action} className="mt-1 flex gap-1">
        <input type="hidden" name="slot_id" value={slot.id} />
        <button
          name="op"
          value={slot.status === 'open' ? 'block' : 'open'}
          disabled={pending}
          className="flex-1 rounded-md bg-gray-800 hover:bg-gray-700 px-2 py-1 text-[11px] text-gray-200 disabled:opacity-50"
        >
          {slot.status === 'open' ? 'Block' : 'Unblock'}
        </button>
        <button
          name="op"
          value="delete"
          disabled={pending}
          className="flex-1 rounded-md bg-red-900/50 hover:bg-red-800/60 px-2 py-1 text-[11px] text-red-200 disabled:opacity-50"
        >
          Delete
        </button>
      </form>
      {state.error && <p className="mt-1 text-[11px] text-red-400">{state.error}</p>}
    </details>
  );
}
