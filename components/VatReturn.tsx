'use client';

import { useState } from 'react';
import { Download, FileDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportPath, downloadBlob } from '@/lib/download';
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

function csvForBoxes(period: string, boxes: VatBoxes): string {
  const lines: string[] = [];
  lines.push('Tax Sole Trader VAT Return');
  lines.push(`Period,${period}`);
  lines.push('');
  for (const def of BOX_DEFS) {
    lines.push(`${def.title} - ${def.subtitle},${boxes[def.key].toFixed(2)}`);
  }
  return lines.join('\n');
}

/// Mirrors the app's own VAT Return screen (vat_return_screen.dart)
/// exactly — same nine boxes, same official wording, same "VAT
/// Export"/"VAT Report" buttons (here: Save CSV / Download PDF). The
/// itemised VAT Statement is its own separate tab, same as the app's
/// own separate VAT Statement screen — not a sub-section here.
export default function VatReturn({
  periods,
  clientUserId,
  clientLabel,
  taxYear,
}: {
  periods: PeriodReport[];
  clientUserId: string;
  clientLabel: string;
  taxYear: string;
}) {
  const [selected, setSelected] = useState(
    periods.find((p) => (p as unknown as { isCurrent?: boolean }).isCurrent)?.period ?? periods[0]?.period ?? '',
  );
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);
  const report = periods.find((p) => p.period === selected) ?? periods[0];

  if (!report) {
    return <p className="py-8 text-center text-sm text-textMuted">No VAT return data synced.</p>;
  }

  const { boxes } = report;
  const payable = boxes.box3 >= boxes.box4;

  function handleSaveCsv() {
    const csv = csvForBoxes(report.period, boxes);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, exportPath(clientLabel, taxYear, 'VAT Return', `${report.period}.csv`));
  }

  async function handleDownloadPdf() {
    setPdfBusy(true);
    setPdfFailed(false);
    try {
      const sanitised = report.period
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
      const path = `${clientUserId}/${sanitised}.pdf`;
      const { data, error } = await supabase.storage.from('accountant-vat-returns').download(path);
      if (error || !data) throw error ?? new Error('No file');
      downloadBlob(data, exportPath(clientLabel, taxYear, 'VAT Return', `${report.period}.pdf`));
    } catch {
      setPdfFailed(true);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-textMuted">
          Period
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm font-semibold text-textPrimary outline-none focus:border-accentStroke"
          >
            {periods.map((p) => (
              <option key={p.period} value={p.period}>
                {p.period}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex gap-2 self-end">
          <button
            onClick={handleSaveCsv}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-textSecondary transition hover:border-accentStroke hover:text-textPrimary"
          >
            <FileDown size={14} /> Save CSV
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfBusy}
            title={pdfFailed ? 'Not available — ask your client to sync' : 'Download PDF'}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-textSecondary transition hover:border-accentStroke hover:text-textPrimary disabled:opacity-50"
          >
            <Download size={14} /> {pdfFailed ? 'Unavailable' : pdfBusy ? '…' : 'PDF'}
          </button>
        </div>
      </div>

      <Card tone="accent" className="mb-4 max-w-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-textMuted">Period</p>
            <p className="text-lg font-bold text-textPrimary">{report.period}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">
              {payable ? 'Net VAT payable' : 'Net VAT reclaimable'}
            </p>
            <p className={`text-2xl font-bold ${payable ? 'text-danger' : 'text-success'}`}>{money(boxes.box5)}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        {BOX_DEFS.map((def) => (
          <Card key={def.key}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-bold text-textPrimary">{def.title}</p>
              <p className="text-xl font-bold text-accentLight">{money(boxes[def.key])}</p>
            </div>
            <p className="mt-1 text-xs leading-snug text-textMuted">{def.subtitle}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
