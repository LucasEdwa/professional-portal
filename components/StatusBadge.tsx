const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-green-900/40 text-green-400 border border-green-800/50',
  pending:   'bg-yellow-900/40 text-yellow-400 border border-yellow-800/50',
  completed: 'bg-gray-800 text-gray-400 border border-gray-700',
  cancelled: 'bg-red-900/40 text-red-400 border border-red-800/50',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.pending}`}>
      {status}
    </span>
  );
}
