import type { AccountantLinkRow } from '@/lib/types';

const CONFIG: Record<AccountantLinkRow['status'], { label: string; dot: string; text: string }> = {
  accepted: { label: 'Connected', dot: 'bg-success', text: 'text-success' },
  pending: { label: 'Awaiting approval', dot: 'bg-warning', text: 'text-warning' },
  revoked: { label: 'Revoked', dot: 'bg-textMuted', text: 'text-textMuted' },
  declined: { label: 'Declined', dot: 'bg-danger', text: 'text-danger' },
};

export default function StatusBadge({ status }: { status: AccountantLinkRow['status'] }) {
  const c = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
