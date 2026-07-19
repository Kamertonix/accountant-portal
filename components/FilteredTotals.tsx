import Card from './Card';

function money(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

interface CategoryTotal {
  category: string;
  total: number;
  count: number;
}

function groupByCategory(items: Record<string, unknown>[]): CategoryTotal[] {
  const totals = new Map<string, CategoryTotal>();
  for (const item of items) {
    const category = String(item.cat ?? 'Other');
    const amount = Number(item.amount) || 0;
    const existing = totals.get(category);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
    } else {
      totals.set(category, { category, total: amount, count: 1 });
    }
  }
  return Array.from(totals.values()).sort((a, b) => b.total - a.total);
}

/// Total + per-category breakdown for whatever set of transaction rows
/// is currently on screen — recomputed for the active type filter
/// (All / Income / Expense / VAT / CIS), not a separate fixed view.
export default function FilteredTotals({ items, label }: { items: Record<string, unknown>[]; label: string }) {
  if (items.length === 0) return null;

  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const byCategory = groupByCategory(items);
  const max = Math.max(1, ...byCategory.map((r) => r.total));

  return (
    <Card className="mb-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-textPrimary">{label} total</p>
        <p className="text-xl font-bold text-textPrimary">{money(total)}</p>
      </div>
      {byCategory.length > 1 && (
        <div className="flex flex-col gap-2.5 border-t border-border pt-3">
          {byCategory.map((row) => (
            <div key={row.category}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-textSecondary">
                  {row.category} <span className="text-textMuted">&middot; {row.count}</span>
                </span>
                <span className="font-bold text-textPrimary">{money(row.total)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-input">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(row.total / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
