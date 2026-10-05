'use client';

import { reviewProfessional, type ReviewState } from './actions';
import { useActionState, useState } from 'react';

export default function ReviewActions({ professionalId, status }: { professionalId: string; status: string }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(reviewProfessional, {});
  const [reason, setReason] = useState('');

  const canApprove = status === 'pending_review' || status === 'suspended';
  const canReject = status === 'pending_review';
  const canSuspend = status === 'approved';

  if (!canApprove && !canReject && !canSuspend) return null;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="professional_id" value={professionalId} />
      {(canReject || canSuspend) && (
        <textarea
          name="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="Reason (required to reject or suspend, shown to the professional)"
          className="w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
      <div className="flex flex-wrap gap-2">
        {canApprove && (
          <button
            name="decision"
            value="approved"
            disabled={pending}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-sm font-medium"
          >
            {status === 'suspended' ? 'Reinstate' : 'Approve'}
          </button>
        )}
        {canReject && (
          <button
            name="decision"
            value="rejected"
            disabled={pending}
            className="px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-sm font-medium"
          >
            Reject
          </button>
        )}
        {canSuspend && (
          <button
            name="decision"
            value="suspended"
            disabled={pending}
            className="px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-sm font-medium"
          >
            Suspend
          </button>
        )}
      </div>
      {state.error && <p className="text-red-400 text-sm">{state.error}</p>}
    </form>
  );
}
