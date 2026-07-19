import Card from './Card';

interface Deadline {
  key: string;
  typeKey: string;
  title: string;
  description: string;
  deadline: string;
  daysRemaining: number;
}

function urgencyTone(days: number): 'danger' | 'warning' | 'success' {
  if (days <= 7) return 'danger';
  if (days <= 30) return 'warning';
  return 'success';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/// Shows the app's own computed HMRC deadlines as cards — never
/// recalculated here. Deliberately visible right on Overview, per
/// client, not buried in a tab, since this is exactly the kind of
/// thing an accountant needs at a glance.
export default function DeadlineCards({ items }: { items: Deadline[] | null }) {
  if (!items || items.length === 0) return null;

  const sorted = [...items].sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <div className="mb-6">
      <p className="mb-3 text-sm font-bold text-textPrimary">Upcoming deadlines</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sorted.map((d) => {
          const tone = urgencyTone(d.daysRemaining);
          return (
            <Card key={d.key} tone={tone}>
              <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">{d.title}</p>
              <p className="mt-1 text-lg font-bold text-textPrimary">{formatDate(d.deadline)}</p>
              <p
                className={`mt-1 text-xs font-semibold ${
                  tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-success'
                }`}
              >
                {d.daysRemaining < 0 ? 'Overdue' : d.daysRemaining === 0 ? 'Due today' : `${d.daysRemaining} days left`}
              </p>
              <p className="mt-2 text-xs text-textMuted">{d.description}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
