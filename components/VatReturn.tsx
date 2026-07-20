'use client';

import { useState } from 'react';
import Card from './Card';

interface VatBoxes {
  box1: number;
  box2: number;
  box3: number;
  box4: number;
  box5: number;
  box6: number;
  box7: number;
  box8: number;
  box9: number;
}

interface PeriodReport {
  period: string;
  boxes: VatBoxes;
}

function money(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

// Exact labels from the app's own vat_return_screen.dart — not
// paraphrased, the official HMRC box wording the client sees too.
const BOX_DEFS: { key: keyof VatBoxes; title: string; subtitle: string }[] = [
  { key: 'box1', title: 'Box 1', subtitle: 'VAT due in this period on sales and other outputs' },
  { key: 'box2', title: 'Box 2', subtitle: 'VAT due in this period on acquisitions from other EC Member States' },
  { key: 'box3', title: 'Box 3', subtitle: 'Total VAT due' },
  { key: 'box4', title: 'Box 4', subtitle: 'VAT reclaimed in this period on purchases and other inputs' },
  { key: 'box5', title: 'Box 5', subtitle: 'Net VAT to pay to HMRC or reclaim from HMRC' },
  { key: 'box6', title: 'Box 6', subtitle: 'Total value of sales and all other outputs excluding VAT' },
  { key: 'box7', title: 'Box 7', subtitle: 'Total value of purchases and all other inputs excluding VAT' },
  { key: 'box8', title: 'Box 8', subtitle: 'Total value of supplies of goods to other EC Member States excluding VAT' },
  { key: 'box9', title: 'Box 9', subtitle: 'Total value of acquisitions of goods from other EC Member States excluding VAT' },
];

/// Mirrors the app's own VAT Return screen (vat_return_screen.dart)
/// exactly — same period list (generated the same way, depending on
/// the client's VAT frequency/quarter-start settings), same nine
/// boxes, same official wording. Every number comes from
/// TaxSummaryService.calculateVatBoxes() as it already ran on the
/// client's device; nothing recalculated here.
export default function VatReturn({ periods }: { periods: PeriodReport[] }) {
  const [selected, setSelected] = useState(periods[0]?.period ?? '');
  const report = periods.find((p) => p.period === selected) ?? periods[0];

  if (!report) {
    return <p className="py-8 text-center text-sm text-textMuted">No VAT return data synced.</p>;
  }

  const { boxes } = report;
  const payable = boxes.box3 >= boxes.box4;

  return (
    <div>
      <div className="mb-4">
        <label className="text-xs font-semibold text-textMuted">
          Period
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="mt-1 block w-full max-w-xs rounded-lg border border-border bg-input px-3 py-2 text-sm font-semibold text-textPrimary outline-none focus:border-accentStroke"
          >
            {periods.map((p) => (
              <option key={p.period} value={p.period}>
                {p.period}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Card tone="accent" className="mb-4 max-w-md">
        <p className="text-xs text-textMuted">Period</p>
        <p className="text-lg font-bold text-textPrimary">{report.period}</p>
        <div className="my-2 h-px bg-border" />
        <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">
          {payable ? 'Net VAT payable' : 'Net VAT reclaimable'}
        </p>
        <p className={`text-2xl font-bold ${payable ? 'text-danger' : 'text-success'}`}>{money(boxes.box5)}</p>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BOX_DEFS.map((def) => (
          <Card key={def.key}>
            <p className="text-sm font-bold text-textPrimary">{def.title}</p>
            <p className="mt-1 text-xs leading-snug text-textMuted">{def.subtitle}</p>
            <p className="mt-2 text-xl font-bold text-accentLight">{money(boxes[def.key])}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
