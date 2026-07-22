'use client';

import { useState } from 'react';
import { Download, FileDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportPath, downloadBlob } from '@/lib/download';
import Card from './Card';

interface VatEntry {
  date: string;
  description: string;
  type: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  excludedFromReturn: boolean;
}

interface PeriodStatement {
  period: string;
  scheme: string;
  isFlatRate: boolean;
  flatRatePercent: number;
  totalNetSales: number;
  totalVatOnSales: number;
  totalNetPurchases: number;
  totalVatOnPurchases: number;
  entries: VatEntry[];
}

function money(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function EntryCard({ entry }: { entry: VatEntry }) {
  return (
    <Card className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-textPrimary">{entry.description}</p>
          {entry.excludedFromReturn && (
            <span className="shrink-0 rounded-full bg-input px-2 py-0.5 text-[11px] font-bold text-textMuted">Not reclaimed</span>
          )}
        </div>
        <p className="text-xs text-textMuted">{entry.date}</p>
      </div>
      <div className="flex shrink-0 gap-5">
        <p className="text-xs">
          <span className="font-semibold text-textMuted">Net </span>
          <span className="font-bold text-textPrimary">{money(entry.netAmount)}</span>
        </p>
        <p className="text-xs">
          <span className="font-semibold text-textMuted">VAT </span>
          <span className="font-bold text-accentLight">{money(entry.vatAmount)}</span>
        </p>
        <p className="text-xs">
          <span className="font-semibold text-textMuted">Gross </span>
          <span className="font-bold text-success">{money(entry.grossAmount)}</span>
        </p>
      </div>
    </Card>
  );
}

function csvForStatement(statement: PeriodStatement): string {
  const lines: string[] = [];
  lines.push('Tax Sole Trader VAT Statement');
  lines.push(`Period,${statement.period}`);
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

/// Mirrors the app's own separate VAT Statement screen
/// (vat_statement_screen.dart) — every sale/purchase entry behind a
/// period's Box 1-9 figures, reachable as its own button/tab in the
/// app, not a sub-section of VAT Return. Own Save (CSV) / Share (PDF)
/// buttons, matching the app's own.
export default function VatStatement({
  periods,
  clientUserId,
  clientLabel,
  taxYear,
}: {
  periods: PeriodStatement[];
  clientUserId: string;
  clientLabel: string;
  taxYear: string;
}) {
  const [selected, setSelected] = useState(
    periods.find((p) => (p as unknown as { isCurrent?: boolean }).isCurrent)?.period ?? periods[0]?.period ?? '',
  );
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);
  const statement = periods.find((p) => p.period === selected) ?? periods[0];

  if (!statement) {
    return <p className="py-8 text-center text-sm text-textMuted">No VAT statement data synced.</p>;
  }

  const sales = statement.entries.filter((e) => e.type === 'Sale');
  const purchases = statement.entries.filter((e) => e.type === 'Purchase');
  const hasEntries = statement.entries.length > 0;

  function handleSaveCsv() {
    const csv = csvForStatement(statement);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, exportPath(clientLabel, taxYear, 'VAT Statements', `${statement.period}.csv`));
  }

  async function handleDownloadPdf() {
    setPdfBusy(true);
    setPdfFailed(false);
    try {
      const sanitised = statement.period
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
      const path = `${clientUserId}/${sanitised}.pdf`;
      const { data, error } = await supabase.storage.from('accountant-vat-statements').download(path);
      if (error || !data) throw error ?? new Error('No file');
      downloadBlob(data, exportPath(clientLabel, taxYear, 'VAT Statements', `${statement.period}.pdf`));
    } catch {
      setPdfFailed(true);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div>
      <Card tone="accent" className="mb-4">
        <p className="text-xs text-textSecondary">
          Every sale and purchase behind this period&rsquo;s VAT return — for reconciling against Box 1-9 before filing.
        </p>
      </Card>

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
            disabled={!hasEntries}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-textSecondary transition hover:border-accentStroke hover:text-textPrimary disabled:opacity-50"
          >
            <FileDown size={14} /> Save CSV
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfBusy || !hasEntries}
            title={pdfFailed ? 'Not available — ask your client to sync' : 'Download PDF'}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-textSecondary transition hover:border-accentStroke hover:text-textPrimary disabled:opacity-50"
          >
            <Download size={14} /> {pdfFailed ? 'Unavailable' : pdfBusy ? '…' : 'PDF'}
          </button>
        </div>
      </div>

      <p className="mb-4 text-xs font-semibold text-textSecondary">
        {statement.scheme}
        {statement.isFlatRate && ` — Flat Rate ${statement.flatRatePercent.toFixed(1)}%, purchases not reclaimed`}
      </p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Net sales</p>
            <p className="text-lg font-bold text-textPrimary">{money(statement.totalNetSales)}</p>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">VAT on sales</p>
            <p className="text-lg font-bold text-accentLight">{money(statement.totalVatOnSales)}</p>
          </div>
        </Card>
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Net purchases</p>
            <p className="text-lg font-bold text-textPrimary">{money(statement.totalNetPurchases)}</p>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">VAT on purchases</p>
            <p className="text-lg font-bold text-accentLight">{money(statement.totalVatOnPurchases)}</p>
          </div>
        </Card>
      </div>

      <p className="mb-2 text-sm font-bold text-textPrimary">Sales</p>
      {sales.length === 0 ? (
        <p className="mb-4 text-xs text-textMuted">No sales recorded for this period.</p>
      ) : (
        <div className="mb-4 flex flex-col gap-2">
          {sales.map((e, i) => (
            <EntryCard key={i} entry={e} />
          ))}
        </div>
      )}

      <p className="mb-2 text-sm font-bold text-textPrimary">Purchases</p>
      {purchases.length === 0 ? (
        <p className="text-xs text-textMuted">No purchases recorded for this period.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {purchases.map((e, i) => (
            <EntryCard key={i} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}
