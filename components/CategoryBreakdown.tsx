import Card from './Card';

function money(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

interface CategoryTotal {
  category: string;
  total: number;
  count: number;
}

function groupByCategory(items: Record<string, unknown>[], type: 'Income' | 'Expense'): CategoryTotal[] {
  const totals = new Map<string, CategoryTotal>();
  for (const item of items) {
    if (item.type !== type) continue;
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

function CategoryList({ title, rows, tone }: { title: string; rows: CategoryTotal[]; tone: 'success' | 'danger' }) {
  const barColor = tone === 'success' ? 'bg-success' : 'bg-danger';
  const textColor = tone === 'success' ? 'text-success' : 'text-danger';
  const max = Math.max(1, ...rows.map((r) => r.total));

  return (
    <Card>
      <p className="mb-3 text-sm font-bold text-textPrimary">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-textMuted">No records.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <div key={row.category}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-textSecondary">
                  {row.category} <span className="text-textMuted">&middot; {row.count}</span>
                </span>
                <span className={`font-bold ${textColor}`}>{money(row.total)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-input">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${(row.total / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function CategoryBreakdown({ items }: { items: Record<string, unknown>[] | null }) {
  if (!items || items.length === 0) return null;

  const income = groupByCategory(items, 'Income');
  const expenses = groupByCategory(items, 'Expense');

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
      <CategoryList title="Income by category" rows={income} tone="success" />
      <CategoryList title="Expenses by category" rows={expenses} tone="danger" />
    </div>
  );
}
