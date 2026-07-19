function humanizeKey(key: string): string {
  const map: Record<string, string> = {
    id: 'ID',
    cat: 'Category',
    desc: 'Description',
    vat: 'VAT',
    cis: 'CIS',
    nino: 'NINO',
    vrn: 'VRN',
  };
  if (map[key]) return map[key];
  const spaced = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (typeof value === 'object') return '{…}';
  return String(value);
}

export default function DataTable({ items }: { items: Record<string, unknown>[] }) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-textMuted">No records in this category for the synced period.</p>;
  }

  // Union of keys across the first handful of rows, so one unusual row
  // doesn't silently hide columns everyone else has.
  const keys = Array.from(new Set(items.slice(0, 20).flatMap((item) => Object.keys(item)))).filter(
    (key) => key !== 'lines' && key !== 'payments' && key !== 'notes' && key !== 'reminders',
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-input text-left text-xs font-bold uppercase tracking-wide text-textMuted">
            {keys.map((key) => (
              <th key={key} className="whitespace-nowrap px-4 py-3">
                {humanizeKey(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={String(item.id ?? i)} className="border-b border-border/50 last:border-0 hover:bg-white/[0.02]">
              {keys.map((key) => (
                <td key={key} className="whitespace-nowrap px-4 py-2.5 text-textSecondary">
                  {formatCell(item[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
