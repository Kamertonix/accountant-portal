import Card from './Card';

interface Deadline {
  key: string;
  typeKey: string;
  title: string;
  description: string;
  deadline: string;
  daysRemaining: number;
  canMarkDone: boolean;
  isOverdue: boolean;
  homeSummary: string;
  periodText: string;
  formattedDate: string;
}

// Same icon-by-type mapping as _DeadlineCard._icon in the app.
function icon(typeKey: string): string {
  if (typeKey.includes('vat')) return '💷';
  if (typeKey.includes('cis')) return '🏗️';
  if (typeKey.includes('mtd')) return '📊';
  if (typeKey.includes('payment')) return '💰';
  return '📅';
}

// Same urgency bands and tones as the app's _DeadlineCard (urgent ≤3
// days, attention ≤7, soft ≤14, default beyond) — just mapped onto
// this app's tone system instead of AppColors.cardOrange etc.
function urgencyTone(days: number): 'danger' | 'warning' | 'success' | 'default' {
  if (days <= 3) return 'danger';
  if (days <= 7) return 'warning';
  if (days <= 14) return 'success';
  return 'default';
}

/// Mirrors the app's own Notifications & Deadlines screen
/// (notifications_deadlines_screen.dart) card-for-card — same icons,
/// same urgency colouring, same 3-state badge: "Due" (period still
/// open), "Mark done" (period ended, actionable in the app), "Overdue
/// — mark done" (past the actual deadline, shown in red). The badge
/// here is always display-only — a <span>, never a button — since
/// only the client's own device can actually mark something done;
/// nothing here can ever write back to the app.
export default function DeadlineCards({ items, clientRemindersEnabled }: { items: Deadline[] | null; clientRemindersEnabled?: boolean }) {
  if (!items || items.length === 0) return null;

  const sorted = [...items].sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-textPrimary">Upcoming deadlines</p>
        {clientRemindersEnabled !== undefined && (
          <span className={`text-xs font-semibold ${clientRemindersEnabled ? 'text-success' : 'text-textMuted'}`}>
            🔔 Client device reminders: {clientRemindersEnabled ? 'On' : 'Off'}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {sorted.map((d) => {
          const tone = urgencyTone(d.daysRemaining);
          const badgeLabel = !d.canMarkDone ? 'Due' : d.isOverdue ? 'Overdue — mark done' : 'Mark done';
          const badgeClass = !d.canMarkDone
            ? 'bg-input text-textMuted'
            : d.isOverdue
              ? 'bg-danger/15 text-danger'
              : 'bg-success/15 text-success';
          return (
            <Card key={d.key} tone={tone === 'default' ? undefined : tone}>
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none">{icon(d.typeKey)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-base font-black text-textPrimary">{d.title}</p>
                    <p className="shrink-0 text-xs font-black text-accentLight">{d.formattedDate}</p>
                  </div>
                  <p className="mt-1.5 text-xs leading-snug text-textSecondary">{d.description}</p>
                  <p className="mt-1.5 text-xs font-semibold text-textMuted">Period: {d.periodText}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                <p className={`text-sm font-black ${tone === 'danger' ? 'text-danger' : 'text-textPrimary'}`}>{d.homeSummary}</p>
                <span className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${badgeClass}`}>{badgeLabel}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
