'use client';

import { useState } from 'react';
import Card from './Card';

interface QuarterReport {
  taxYear: string;
  quarter: string;
  periodLabel: string;
  income: number;
  expenses: number;
  profitLoss: number;
  transactionCount: number;
  invoiceCount: number;
  breakdown: {
    invoiceIncome: number;
    transactionIncome: number;
    manualIncome: number;
    transactionExpenses: number;
    manualExpenses: number;
    vehicleExpensesExcluded: number;
    mileage: number;
    mileageTrips: number;
    mileageEnabled: boolean;
  };
}

function money(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function AmountLine({ label, value, strong, color }: { label: string; value: number; strong?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={`${strong ? 'text-sm font-bold' : 'text-sm font-semibold'} text-textSecondary`}>{label}</span>
      <span className={`${strong ? 'text-base font-bold' : 'text-sm font-bold'}`} style={color ? { color } : undefined}>
        {money(value)}
      </span>
    </div>
  );
}

function BreakdownLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-xs">
      <span className="text-textMuted">{label}</span>
      <span className="font-semibold text-textSecondary">{money(value)}</span>
    </div>
  );
}

/// Mirrors the app's own MTD Hub screen (mtd_hub_screen.dart) exactly —
/// same quarters, same report card layout, same breakdown lines, same
/// footer note. Nothing here is calculated in the portal; every number
/// comes straight from MtdQuarterlyReportService.build() as it already
/// ran on the client's device.
export default function MtdReport({ quarters }: { quarters: QuarterReport[] }) {
  const [selected, setSelected] = useState(
    quarters.find((q) => (q as unknown as { isCurrent?: boolean }).isCurrent)?.quarter ?? quarters[0]?.quarter ?? 'Q1',
  );
  const report = quarters.find((q) => q.quarter === selected) ?? quarters[0];

  if (!report) {
    return <p className="py-8 text-center text-sm text-textMuted">No MTD report data synced.</p>;
  }

  const isLoss = report.profitLoss < 0;
  const profitLabel = isLoss ? 'Loss' : 'Profit';

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {quarters.map((q) => (
          <button
            key={q.quarter}
            onClick={() => setSelected(q.quarter)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              selected === q.quarter ? 'bg-accent text-white' : 'border border-border bg-input text-textSecondary hover:border-accentStroke'
            }`}
          >
            {q.quarter}
          </button>
        ))}
      </div>

      <Card tone="accent" className="max-w-md">
        <p className="text-base font-black text-textPrimary">{report.periodLabel}</p>
        <div className="mt-4 flex flex-col">
          <AmountLine label="Income" value={report.income} />
          <AmountLine label="Expenses" value={report.expenses} />
        </div>
        <div className="my-2 h-px bg-border" />
        <AmountLine
          label={profitLabel}
          value={Math.abs(report.profitLoss)}
          strong
          color={isLoss ? '#FF4D4F' : '#16C784'}
        />

        <div className="mt-4 rounded-xl border border-accentStroke/40 bg-input/40 p-3">
          <p className="mb-1 text-xs font-bold text-textPrimary">Income breakdown</p>
          <BreakdownLine label="Invoices" value={report.breakdown.invoiceIncome} />
          <BreakdownLine label="Transactions" value={report.breakdown.transactionIncome} />
          <BreakdownLine label="Manual" value={report.breakdown.manualIncome} />

          <p className="mt-3 mb-1 text-xs font-bold text-textPrimary">Expenses breakdown</p>
          <BreakdownLine label="Transactions expenses" value={report.breakdown.transactionExpenses} />
          <BreakdownLine label="Manual expenses" value={report.breakdown.manualExpenses} />
          {report.breakdown.mileageEnabled && (
            <>
              {report.breakdown.vehicleExpensesExcluded > 0 && (
                <BreakdownLine label="Vehicle expenses excluded" value={-report.breakdown.vehicleExpensesExcluded} />
              )}
              <BreakdownLine label="Mileage" value={report.breakdown.mileage} />
            </>
          )}
        </div>

        <p className="mt-3 text-xs font-semibold text-accentLight">
          The official MTD submission includes Income and Expenses only — the breakdown above is shown for review, same
          as in the client&rsquo;s app.
        </p>
      </Card>
    </div>
  );
}
