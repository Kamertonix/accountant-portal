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

interface VatEntry {
  date: string;
  description: string;
  type: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  excludedFromReturn: boolean;
}

interface VatStatement {
  scheme: string;
  isFlatRate: boolean;
  flatRatePercent: number;
  totalNetSales: number;
  totalVatOnSales: number;
  totalNetPurchases: number;
  totalVatOnPurchases: number;
  entries: VatEntry[];
}

interface PeriodReport {
  period: string;
  boxes: VatBoxes;
  statement?: VatStatement;
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

function EntryCard({ entry }: { entry: VatEntry }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-textPrimary">{entry.description}</p>
        {entry.excludedFromReturn && (
          <span className="shrink-0 rounded-full bg-input px-2 py-0.5 text-[11px] font-bold text-textMuted">Not reclaimed</span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-textMuted">{entry.date}</p>
      <div className="mt-2 flex gap-6">
        <div>
          <p className="text-[11px] font-semibold text-textMuted">Net</p>
          <p className="text-sm font-bold text-textPrimary">{money(entry.netAmount)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-textMuted">VAT</p>
          <p className="text-sm font-bold text-accentLight">{money(entry.vatAmount)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-textMuted">Gross</p>
          <p className="text-sm font-bold text-success">{money(entry.grossAmount)}</p>
        </div>
      </div>
    </Card>
  );
}

function csvForStatement(period: string, statement: VatStatement): string {
  const lines: string[] = [];
  lines.push('Tax Sole Trader VAT Statement');
  lines.push(`Period,${period}`);
  lines.push(`Scheme,${statement.scheme}`);
  lines.push('');
  lines.push('Date,Description,Type,Net,VAT,Gross,Excluded From Return');
  for (const e of statement.entries) {
    lines.push(
      [e.date, `"${e.description.replace(/"/g, '""')}"`, e.type, e.netAmount.toFixed(2), e.vatAmount.toFixed(2), e.grossAmount.toFixed(2), e.excludedFromReturn ? 'Yes' : 'No'].join(','),
    );
  }
  return lines.join('\n');
}

/// Mirrors the app's own VAT Return + VAT Statement screens together
/// — the 9-box HMRC summary, plus the itemised sales/purchases detail
/// behind it, plus Save (CSV) and PDF download, matching the app's
/// own Save/Share buttons. Nothing recalculated here.
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
  const [selected, setSelected] = useState(periods[0]?.period ?? '');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);
  const report = periods.find((p) => p.period === selected) ?? periods[0];

  if (!report) {
    return <p className="py-8 text-center text-sm text-textMuted">No VAT return data synced.</p>;
  }

  const { boxes, statement } = report;
  const payable = boxes.box3 >= boxes.box4;
  const sales = statement?.entries.filter((e) => e.type === 'Sale') ?? [];
  const purchases = statement?.entries.filter((e) => e.type === 'Purchase') ?? [];

  function handleSaveCsv() {
    if (!statement) return;
    const csv = csvForStatement(report.period, statement);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, exportPath(clientLabel, taxYear, 'VAT Statements', `${report.period}.csv`));
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
      const { data, error } = await supabase.storage.from('accountant-vat-statements').download(path);
      if (error || !data) throw error ?? new Error('No file');
      downloadBlob(data, exportPath(clientLabel, taxYear, 'VAT Statements', `${report.period}.pdf`));
    } catch {
      setPdfFailed(true);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
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

        <div className="ml-auto flex gap-2 self-end">
          <button
            onClick={handleSaveCsv}
            disabled={!statement || statement.entries.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-textSecondary transition hover:border-accentStroke hover:text-textPrimary disabled:opacity-50"
          >
            <FileDown size={14} /> Save CSV
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfBusy || !statement || statement.entries.length === 0}
            title={pdfFailed ? 'Not available — ask your client to sync' : 'Download PDF'}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-textSecondary transition hover:border-accentStroke hover:text-textPrimary disabled:opacity-50"
          >
            <Download size={14} /> {pdfFailed ? 'Unavailable' : pdfBusy ? '…' : 'PDF'}
          </button>
        </div>
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

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BOX_DEFS.map((def) => (
          <Card key={def.key}>
            <p className="text-sm font-bold text-textPrimary">{def.title}</p>
            <p className="mt-1 text-xs leading-snug text-textMuted">{def.subtitle}</p>
            <p className="mt-2 text-xl font-bold text-accentLight">{money(boxes[def.key])}</p>
          </Card>
        ))}
      </div>

      {statement && (
        <>
          <p className="mb-2 text-xs font-semibold text-textSecondary">
            {statement.scheme}
            {statement.isFlatRate && ` — Flat Rate ${statement.flatRatePercent.toFixed(1)}%, purchases not reclaimed`}
          </p>

          <p className="mb-2 mt-4 text-sm font-bold text-textPrimary">Sales</p>
          {sales.length === 0 ? (
            <p className="text-xs text-textMuted">No sales recorded for this period.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {sales.map((e, i) => (
                <EntryCard key={i} entry={e} />
              ))}
            </div>
          )}

          <p className="mb-2 mt-5 text-sm font-bold text-textPrimary">Purchases</p>
          {purchases.length === 0 ? (
            <p className="text-xs text-textMuted">No purchases recorded for this period.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {purchases.map((e, i) => (
                <EntryCard key={i} entry={e} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
