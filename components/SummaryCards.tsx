import Card from './Card';

function money(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

/// Deliberately shows only unambiguous arithmetic — sums of amounts,
/// nothing that requires knowing the client's VAT scheme (flat rate vs
/// standard), Class 2/4 NI thresholds, or CIS deduction rates. Getting
/// those wrong here would risk an accountant filing on a bad number.
/// The VAT/CIS tabs still show itemized records; this card just adds
/// up income vs expense, which is safe regardless of scheme.
export default function SummaryCards({ items }: { items: Record<string, unknown>[] | null }) {
  if (!items) {
    return (
      <Card tone="warning" className="mb-6">
        <p className="text-sm text-textSecondary">
          Financial summary needs the &ldquo;Transactions&rdquo; category to be shared and synced by your client.
        </p>
      </Card>
    );
  }

  let income = 0;
  let expense = 0;
  let vatCount = 0;
  let cisCount = 0;
  for (const item of items) {
    const amount = Number(item.amount) || 0;
    if (item.type === 'Income') income += amount;
    else expense += amount;
    if (item.vat === true) vatCount += 1;
    if (item.cis === true) cisCount += 1;
  }
  const net = income - expense;

  const cards: { label: string; value: string; tone: 'success' | 'danger' | 'default' }[] = [
    { label: 'Income', value: money(income), tone: 'success' },
    { label: 'Expenses', value: money(expense), tone: 'danger' },
    { label: 'Net', value: money(net), tone: net >= 0 ? 'success' : 'danger' },
    { label: 'Records', value: String(items.length), tone: 'default' },
  ];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} tone={c.tone}>
            <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-textPrimary">{c.value}</p>
          </Card>
        ))}
      </div>
      {(vatCount > 0 || cisCount > 0) && (
        <p className="mt-3 text-xs text-textMuted">
          {vatCount} VAT-flagged &middot; {cisCount} CIS-flagged record{vatCount + cisCount === 1 ? '' : 's'} in this period
          &mdash; these totals are simple sums, not the official VAT/CIS return figures. Check the client&rsquo;s own
          VAT/Self Assessment reports in the app for filing figures.
        </p>
      )}
    </div>
  );
}
