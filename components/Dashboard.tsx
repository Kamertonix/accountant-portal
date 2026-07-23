'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Card from './Card';

interface DashboardEntry {
  periodKey: string;
  periodTitle: string;
  periodRange: string;
  income: number;
  expenses: number;
  profit: number;
  estimatedTax: number;
  incomeTax: number;
  class2Ni: number;
  class4Ni: number;
  vatEnabled: boolean;
  vehicleEnabled: boolean;
  usingActualVehicleExpenses: boolean;
  mileageMiles: number;
  mileageClaim: number;
  mileageTrips: number;
  receiptsTotal: number;
  receiptsCount: number;
  vatEstimate: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  paidInvoices: number;
  invoiceCount: number;
  insight: string;
}

interface TaxBreakdownData {
  taxYear: string;
  profit: number;
  totalIncome: number;
  incomeTax: number;
  class2Ni: number;
  class4Ni: number;
  remainingDue: number;
  refundEstimate: number;
  payeEnabled: boolean;
  cisEnabled: boolean;
  payeSalary: number;
  payeTaxPaid: number;
  payeAlreadyPaid: number;
  hmrcBeforePaye: number;
  effectiveRate: number;
  riskTitle: string;
  riskColorHex: string;
  cisSuffered: number;
  paymentOnAccount: number;
}

interface DashboardPayload {
  months: DashboardEntry[];
  quarters: DashboardEntry[];
  taxYear: DashboardEntry;
  currentQuarterLabel: string;
  taxBreakdown: TaxBreakdownData;
}

function money(n: number | undefined): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(n) || 0);
}

function hasValue(n: number | undefined): boolean {
  return Math.abs(Number(n) || 0) >= 0.005;
}

type TabKey = 'month' | 'quarter' | 'taxYear';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'taxYear', label: 'Tax Year' },
];

// Small breakdown row, same visual shape as SelfAssessmentSummary's
// BreakRow — reused here so the Tax Breakdown panel reads consistently
// with the rest of the portal.
function BreakRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="mb-2 flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
      <p className="text-sm font-semibold text-textSecondary">{title}</p>
      <p className="text-sm font-bold text-textPrimary">{value}</p>
    </div>
  );
}

// Mirrors the app's own "HMRC Tax Breakdown" screen
// (tax_breakdown_screen.dart) — opened in the app by tapping the
// Estimated Tax card. Same item list, same conditional rows (CIS,
// PAYE), same order. Every figure is exactly what
// TaxSummaryService.buildTaxBreakdownSummary() already computed —
// nothing recalculated here, including the risk tier and the £12,570
// personal allowance figure, which are the app's own fixed labels/
// thresholds, not portal logic.
function TaxBreakdownPanel({ data }: { data: TaxBreakdownData }) {
  const dueTitle = data.refundEstimate > 0 ? 'Possible refund' : 'Remaining estimated due';
  const dueValue = data.refundEstimate > 0 ? money(data.refundEstimate) : money(data.remainingDue);
  const showCis = data.cisEnabled || hasValue(data.cisSuffered);
  const showPaye = data.payeEnabled || hasValue(data.payeAlreadyPaid);

  return (
    <Card className="mb-4">
      <p className="mb-3 text-sm font-bold text-textPrimary">HMRC Tax Breakdown</p>
      <BreakRow title="Tax status" value={data.riskTitle} />
      <BreakRow title="Total income" value={money(data.profit)} />
      <BreakRow title="Income tax" value={money(data.incomeTax)} />
      <BreakRow title="Class 2 NIC" value={money(data.class2Ni)} />
      <BreakRow title="Class 4 NIC" value={money(data.class4Ni)} />
      {showCis && <BreakRow title="CIS suffered" value={`-${money(data.cisSuffered)}`} />}
      {showPaye && (
        <>
          <BreakRow title="HMRC before PAYE" value={money(data.hmrcBeforePaye)} />
          <BreakRow title="PAYE already paid" value={`-${money(data.payeAlreadyPaid)}`} />
        </>
      )}
      <BreakRow title={dueTitle} value={dueValue} />
      <BreakRow title="Personal allowance" value="£12,570" />
      <BreakRow title="Effective tax rate" value={`${data.effectiveRate.toFixed(1)}%`} />
      <p className="mt-1 text-xs text-textMuted">
        {data.taxYear} &mdash; the app&rsquo;s own estimate, not a filed or final return.
      </p>
    </Card>
  );
}

// Mirrors the app's own Business Dashboard screen (dashboard_screen.dart)
// card-for-card: Estimated tax (tap for the Tax Breakdown detail),
// Profit, Income/Expenses, Mileage claim, Current UK quarter, AI
// Insight, VAT threshold, Receipts/VAT, Invoices/Income. Every number
// is exactly what TaxSummaryService.buildDashboardSummary() already
// computed on the client's device for that specific month/quarter —
// nothing recalculated in the portal. The one exception is the
// VAT-threshold progress-bar fraction (income / £90,000), which is
// pure display layout against a constant the app itself states in its
// own label text, not tax logic.
//
// Month/Quarter navigation (the chevrons) only steps through periods
// the device already synced — bounded to the current tax year's
// start through the current month/quarter, exactly like the app's own
// back-navigation limit. It never invents a period the app hasn't
// already calculated.
export default function Dashboard({ payload, syncedAt }: { payload?: DashboardPayload; syncedAt: string }) {
  const months = payload?.months ?? [];
  const quarters = payload?.quarters ?? [];
  const [tab, setTab] = useState<TabKey>('taxYear');
  const [monthIndex, setMonthIndex] = useState(months.length - 1);
  const [quarterIndex, setQuarterIndex] = useState(quarters.length - 1);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const list = tab === 'month' ? months : tab === 'quarter' ? quarters : null;
  const index = tab === 'month' ? monthIndex : quarterIndex;
  const setIndex = tab === 'month' ? setMonthIndex : setQuarterIndex;
  const data = tab === 'taxYear' ? payload?.taxYear : list?.[index];

  if (!payload || !data) {
    return (
      <Card tone="warning">
        <p className="text-sm text-textSecondary">No dashboard data synced yet.</p>
      </Card>
    );
  }

  const canGoBack = list ? index > 0 : false;
  const canGoForward = list ? index < list.length - 1 : false;
  const vatThresholdRatio = Math.min(Math.max(data.income / 90000, 0), 1);

  return (
    <div>
      <Card className="mb-4">
        <p className="text-xs text-textMuted">
          Synced {new Date(syncedAt).toLocaleString()} &mdash; the app&rsquo;s own Business Dashboard, real-time
          business overview.
        </p>
      </Card>

      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? 'bg-accent text-white'
                : 'border border-border bg-input text-textSecondary hover:border-accentStroke'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2">
        {list && (
          <button
            onClick={() => canGoBack && setIndex(index - 1)}
            disabled={!canGoBack}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition ${
              canGoBack
                ? 'border-accentStroke bg-input text-textPrimary hover:border-accentLight'
                : 'cursor-not-allowed border-border bg-input text-textMuted opacity-50'
            }`}
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <Card tone="accent" className="flex-1">
          <p className="text-xs font-bold text-accentLight">Dashboard period</p>
          <p className="mt-1 text-sm font-bold text-textPrimary">{data.periodRange}</p>
        </Card>
        {list && (
          <button
            onClick={() => canGoForward && setIndex(index + 1)}
            disabled={!canGoForward}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition ${
              canGoForward
                ? 'border-accentStroke bg-input text-textPrimary hover:border-accentLight'
                : 'cursor-not-allowed border-border bg-input text-textMuted opacity-50'
            }`}
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      <button onClick={() => setShowBreakdown((v) => !v)} className="mb-4 block w-full text-left">
        <Card tone="warning" className="transition hover:border-warning/70">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-warning">Estimated tax</p>
            <p className="text-xs font-semibold text-warning">{showBreakdown ? 'Hide details ▲' : 'View details ▼'}</p>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-sm font-bold text-warning">Total</p>
            <p className="text-lg font-bold text-warning">{money(data.estimatedTax)}</p>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs font-bold text-warning">Income Tax</p>
            <p className="text-xs font-bold text-warning">{money(data.incomeTax)}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-warning">Class 2 NI</p>
            <p className="text-xs font-bold text-warning">{money(data.class2Ni)}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-warning">Class 4 NI</p>
            <p className="text-xs font-bold text-warning">{money(data.class4Ni)}</p>
          </div>
        </Card>
      </button>

      {showBreakdown && payload.taxBreakdown && <TaxBreakdownPanel data={payload.taxBreakdown} />}

      <Card tone="success" className="mb-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-textPrimary">Profit &middot; {data.periodTitle}</p>
          <p className="text-lg font-bold text-textPrimary">{money(data.profit)}</p>
        </div>
        <p className="mt-1 text-xs text-textSecondary">Income minus expenses</p>
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-textPrimary">💷 Income</p>
            <p className="text-base font-bold text-textPrimary">{money(data.income)}</p>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-textPrimary">🔒 Expenses</p>
            <p className="text-base font-bold text-textPrimary">{money(data.expenses)}</p>
          </div>
        </Card>
      </div>

      {data.vehicleEnabled && (
        <Card className="mb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-textPrimary">🚗 Mileage claim</p>
            <p className="text-sm font-bold text-textPrimary">{money(data.mileageClaim)}</p>
          </div>
          <p className="mt-1 text-xs text-textMuted">
            {data.usingActualVehicleExpenses
              ? 'Actual vehicle expenses method — mileage excluded'
              : `${data.mileageMiles.toFixed(1)} miles \u00b7 ${data.mileageTrips} trips in this period`}
          </p>
        </Card>
      )}

      <Card className="mb-4">
        <p className="text-sm font-bold text-warning">AI Insight</p>
        <p className="mt-1 text-sm font-semibold text-textSecondary">{data.insight}</p>
      </Card>

      {data.vatEnabled && (
        <Card className="mb-4">
          <p className="text-sm font-bold text-textPrimary">VAT Threshold</p>
          <p className="mt-1 text-xs text-textSecondary">{money(data.income)} of £90,000 VAT threshold</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-warning" style={{ width: `${vatThresholdRatio * 100}%` }} />
          </div>
        </Card>
      )}

      <p className="mb-2 text-sm font-bold text-textPrimary">{data.vatEnabled ? 'Receipts / VAT' : 'Receipts'}</p>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-textPrimary">Expenses &middot; {data.receiptsCount}</p>
            <p className="text-sm font-bold text-textPrimary">{money(data.receiptsTotal)}</p>
          </div>
        </Card>
        {data.vatEnabled && (
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-textPrimary">VAT estimate</p>
              <p className="text-sm font-bold text-textPrimary">{money(data.vatEstimate)}</p>
            </div>
          </Card>
        )}
      </div>

      <p className="mb-2 text-sm font-bold text-textPrimary">Invoices / Income</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-textPrimary">Unpaid</p>
            <p className="text-sm font-bold text-textPrimary">{money(data.unpaidInvoices)}</p>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-textPrimary">Overdue</p>
            <p className="text-sm font-bold text-textPrimary">{money(data.overdueInvoices)}</p>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-textPrimary">Invoices</p>
            <p className="text-sm font-bold text-textPrimary">{data.invoiceCount}</p>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-textPrimary">Paid this period</p>
            <p className="text-sm font-bold text-textPrimary">{money(data.paidInvoices)}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
