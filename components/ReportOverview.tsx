'use client';

import { useState } from 'react';
import { Download, FileDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportPath, downloadBlob } from '@/lib/download';
import Card from './Card';

interface ReportPeriod {
  period: string;
  taxYear: string;
  income: number;
  rawBusinessExpenses: number;
  expenses: number;
  profit: number;
  vatAmount: number;
  cisSuffered: number;
  vatRegistered: boolean;
  cisRegistered: boolean;
  taxBeforeCis: number;
  taxReserve: number;
  transactionCount: number;
  invoiceCount: number;
  mileageMiles: number;
  mileageClaim: number;
  mileageTrips: number;
  vehicleNote: string;
  vehicleConfigured: boolean;
  incomeByCategory: { title: string; amount: number }[];
  expensesByCategory: { title: string; amount: number }[];
  fullReport: string;
}

interface MonthlySeries {
  labels: string[];
  income: number[];
  expenses: number[];
}

function money(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: 'default' | 'danger' | 'success' | 'accent' }) {
  const valueColor = { default: 'text-textPrimary', danger: 'text-danger', success: 'text-success', accent: 'text-accentLight' }[tone];
  return (
    <Card>
      <p className="text-xs font-semibold text-textMuted">{label}</p>
      <p className={`mt-2 text-xl font-black ${valueColor}`}>{money(value)}</p>
    </Card>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
      <p className="text-sm font-semibold text-textSecondary">{label}</p>
      <p className="text-sm font-bold text-textPrimary">{value}</p>
    </div>
  );
}

function CategoryBars({ title, data, tone }: { title: string; data: { title: string; amount: number }[]; tone: 'success' | 'danger' }) {
  const rows = [...data].sort((a, b) => b.amount - a.amount);
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.amount), 1);
  const bar = tone === 'success' ? 'bg-success' : 'bg-danger';

  return (
    <Card>
      <p className="mb-3 text-sm font-bold text-textPrimary">{title}</p>
      <div className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.title}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-textSecondary">{row.title}</span>
              <span className="font-bold text-textPrimary">{money(row.amount)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-input">
              <div className={`h-full rounded-full ${bar}`} style={{ width: `${(row.amount / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MonthlyChart({ series }: { series: MonthlySeries | null }) {
  if (!series || series.labels.length === 0) return null;
  const max = Math.max(...series.income, ...series.expenses, 1);
  const barHeight = 140;

  return (
    <Card>
      <p className="text-sm font-black text-textPrimary">Income vs expenses by month</p>
      <p className="mt-0.5 text-xs font-semibold text-textSecondary">Apr to Mar tax-year view — posted business records only</p>
      <div className="mt-5 flex items-end gap-1" style={{ height: barHeight }}>
        {series.labels.map((label, i) => {
          const incomeH = (series.income[i] / max) * barHeight;
          const expenseH = (series.expenses[i] / max) * barHeight;
          return (
            <div key={label} className="flex flex-1 flex-col items-center justify-end gap-0.5" style={{ height: barHeight }}>
              <div className="flex w-full flex-1 items-end justify-center gap-0.5">
                <div className="w-1/3 rounded-t bg-accentLight" style={{ height: Math.max(2, incomeH) }} title={`Income: ${money(series.income[i])}`} />
                <div className="w-1/3 rounded-t bg-danger" style={{ height: Math.max(2, expenseH) }} title={`Expenses: ${money(series.expenses[i])}`} />
              </div>
              <span className="mt-1 text-[10px] font-semibold text-textMuted">{label.slice(0, 3)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-5">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-textSecondary">
          <span className="h-2.5 w-2.5 rounded-full bg-accentLight" /> Income
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-textSecondary">
          <span className="h-2.5 w-2.5 rounded-full bg-danger" /> Expenses
        </span>
      </div>
    </Card>
  );
}

/// Mirrors the app's own Reports screen (reports_screen.dart) —
/// same four metric cards, same VAT/CIS summary, same monthly bar
/// chart, same "Full Report" text block. Replaces the portal's
/// earlier custom Overview entirely; every number here comes from
/// TaxSummaryService.buildReportSummary() / buildMonthlyReportSeries()
/// as the app itself computed them.
export default function ReportOverview({
  periods,
  monthly,
  clientUserId,
  clientLabel,
  taxYear,
}: {
  periods: ReportPeriod[];
  monthly: MonthlySeries | null;
  clientUserId: string;
  clientLabel: string;
  taxYear: string;
}) {
  const [selected, setSelected] = useState(periods[0]?.period ?? '');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);
  const report = periods.find((p) => p.period === selected) ?? periods[0];

  if (!report) {
    return <p className="py-8 text-center text-sm text-textMuted">No report data synced.</p>;
  }

  const showVat = report.vatRegistered;
  const showCis = report.cisRegistered;

  function handleSaveCsv() {
    const lines = [
      'Tax Sole Trader Report',
      `Period,${report.period}`,
      `Tax Year,${report.taxYear}`,
      '',
      `Income,${report.income.toFixed(2)}`,
      `Expenses,${report.expenses.toFixed(2)}`,
      `Net profit,${report.profit.toFixed(2)}`,
      ...(showVat ? [`VAT,${report.vatAmount.toFixed(2)}`] : []),
      ...(showCis ? [`CIS suffered,${report.cisSuffered.toFixed(2)}`] : []),
      `Tax reserve estimate,${report.taxReserve.toFixed(2)}`,
      '',
      `Transactions,${report.transactionCount}`,
      `Invoices,${report.invoiceCount}`,
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, exportPath(clientLabel, taxYear, 'Reports', `${report.period}.csv`));
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
      const { data, error } = await supabase.storage.from('accountant-reports').download(path);
      if (error || !data) throw error ?? new Error('No file');
      downloadBlob(data, exportPath(clientLabel, taxYear, 'Reports', `${report.period}.pdf`));
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

      {report.vehicleConfigured && report.vehicleNote && (
        <Card tone="warning" className="mb-4">
          <p className="text-xs font-semibold text-textSecondary">{report.vehicleNote}</p>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Income" value={report.income} tone="accent" />
        <MetricCard label="Expenses" value={report.expenses} tone="danger" />
        <MetricCard label="Net profit" value={report.profit} tone="success" />
        <MetricCard label="Tax reserve estimate" value={report.taxReserve} tone="default" />
      </div>

      {(showVat || showCis) && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {showVat && (
            <Card>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-bold text-textPrimary">VAT Summary</p>
                <p className="text-xl font-black text-accentLight">{money(report.vatAmount)}</p>
              </div>
            </Card>
          )}
          {showCis && (
            <Card>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-bold text-textPrimary">CIS Summary</p>
                <p className="text-xl font-black" style={{ color: '#9B51FF' }}>
                  {money(report.cisSuffered)}
                </p>
              </div>
            </Card>
          )}
        </div>
      )}

      <div className="mb-6">
        <MonthlyChart series={monthly} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CategoryBars title="Income by category" data={report.incomeByCategory} tone="success" />
        <CategoryBars title="Expenses by category" data={report.expensesByCategory} tone="danger" />
      </div>

      <Card>
        <p className="mb-3 text-sm font-bold text-textPrimary">Full Report</p>
        <div className="flex flex-col gap-2">
          <ReportRow label="Tax year" value={report.taxYear} />
          <ReportRow label="Selected period" value={report.period} />
          <ReportRow label="Income" value={money(report.income)} />
          <ReportRow label="Expenses total" value={money(report.expenses)} />
          {report.mileageClaim > 0 && <ReportRow label="Mileage claim included" value={money(report.mileageClaim)} />}
          <ReportRow label="Allowable expenses" value={money(report.rawBusinessExpenses)} />
          <ReportRow label="Profit" value={money(report.profit)} />
          <ReportRow label="Estimated tax before CIS" value={money(report.taxBeforeCis)} />
          {report.vatRegistered && <ReportRow label="VAT estimate" value={money(report.vatAmount)} />}
          {report.cisRegistered && <ReportRow label="CIS suffered" value={`-${money(report.cisSuffered)}`} />}
          <ReportRow label="Suggested tax reserve" value={money(report.taxReserve)} />
          <ReportRow label="Transactions saved" value={String(report.transactionCount)} />
          <ReportRow label="Invoices saved" value={String(report.invoiceCount)} />
        </div>
        <p className="mt-3 text-xs font-semibold text-textMuted">This report is prepared for bookkeeping review only.</p>
      </Card>
    </div>
  );
}
