'use client';

import { useState } from 'react';
import { Download, FileDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportPath, downloadBlob } from '@/lib/download';
import Card from './Card';

function money(n: unknown): string {
  const value = Number(n) || 0;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}

function signedMoney(n: unknown): string {
  const value = Number(n) || 0;
  return value < 0 ? `-${money(Math.abs(value))}` : money(value);
}

function hasValue(n: unknown): boolean {
  return Math.abs(Number(n) || 0) >= 0.005;
}

// Balancing payment + 1st payment on account are due 31 January after
// the tax year ends; 2nd payment on account is due the following 31
// July — same rule as _PaymentDatesCard._deadlineDates in the app.
function deadlineDates(taxYear: string): [string, string] {
  const parts = (taxYear || '').split('-');
  const endYear = parts.length > 1 ? Number(parts[1]) || new Date().getFullYear() : new Date().getFullYear();
  const deadlineYear = endYear + 1;
  return [`31 January ${deadlineYear}`, `31 July ${deadlineYear}`];
}

function BreakRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="mb-2 flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
      <p className="text-sm font-semibold text-textSecondary">{title}</p>
      <p className="text-sm font-bold text-textPrimary">{value}</p>
    </div>
  );
}

/// Mirrors the app's own Self Assessment screen (self_assessment_
/// screen.dart) card-for-card: Estimated tax payable, Upcoming HMRC
/// Payments, Self-employment profit, registration threshold warnings,
/// the full HMRC Tax Breakdown (same conditional rows, same order),
/// readiness and records panels. Every number and every visibility
/// condition matches the app exactly — nothing recalculated here.
export default function SelfAssessmentSummary({
  summary,
  syncedAt,
  csv,
  clientUserId,
  clientLabel,
  taxYear,
}: {
  summary: Record<string, unknown>;
  syncedAt: string;
  csv?: string;
  clientUserId: string;
  clientLabel: string;
  taxYear: string;
}) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);

  function handleSaveCsv() {
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, exportPath(clientLabel, taxYear, 'Self Assessment', 'summary.csv'));
  }

  async function handleDownloadPdf() {
    setPdfBusy(true);
    setPdfFailed(false);
    try {
      const path = `${clientUserId}/summary.pdf`;
      const { data, error } = await supabase.storage.from('accountant-self-assessment').download(path);
      if (error || !data) throw error ?? new Error('No file');
      downloadBlob(data, exportPath(clientLabel, taxYear, 'Self Assessment', 'summary.pdf'));
    } catch {
      setPdfFailed(true);
    } finally {
      setPdfBusy(false);
    }
  }

  const num = (key: string) => Number(summary[key]) || 0;
  const bool = (key: string) => summary[key] === true;

  const finalTax = num('finalTax');
  const refundEstimate = num('refundEstimate');
  const january = num('januaryPayment');
  const july = num('julyPayment');
  const [janDate, julDate] = deadlineDates(String(summary.taxYear ?? ''));

  const showPaye = hasValue(summary.payeSalary) || hasValue(summary.payeTaxPaid);
  const showMileage = hasValue(summary.mileageClaim);
  const showCis = bool('cisEnabled') || hasValue(summary.cisSuffered);
  const showStudentLoan = bool('studentLoanEnabled') || hasValue(summary.studentLoanRepayment);
  const showMarriageAllowance = hasValue(summary.marriageAllowanceReduction);
  const showPaymentOnAccount = hasValue(summary.paymentOnAccount);
  const showRefund = hasValue(summary.refundEstimate);

  return (
    <div>
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-textMuted">
            Synced {new Date(syncedAt).toLocaleString()} &mdash; the app&rsquo;s own estimate for {String(summary.taxYear ?? '')}, not a
            filed or final return.
          </p>
          <div className="flex shrink-0 gap-2">
            {csv && (
              <button
                onClick={handleSaveCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-textSecondary transition hover:border-accentStroke hover:text-textPrimary"
              >
                <FileDown size={13} /> Save CSV
              </button>
            )}
            <button
              onClick={handleDownloadPdf}
              disabled={pdfBusy}
              title={pdfFailed ? 'Not available yet — ask your client to sync' : 'Download PDF'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-textSecondary transition hover:border-accentStroke hover:text-textPrimary disabled:opacity-50"
            >
              <Download size={13} /> {pdfFailed ? 'Unavailable' : pdfBusy ? '…' : 'Download PDF'}
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Estimated tax payable */}
        <Card tone="warning">
          <p className="text-sm font-bold text-warning">Estimated tax payable</p>
          <p className="mt-1.5 text-lg font-bold text-warning">{money(finalTax)}</p>
          <p className="mt-1.5 text-sm font-bold text-warning">
            {refundEstimate > 0 ? 'Possible repayment position' : `Estimated 31 Jan payment: ${money(january)}`}
          </p>
          {refundEstimate > 0 && (
            <p className="mt-3 text-sm font-bold text-success">Estimated refund / overpaid: {money(refundEstimate)}</p>
          )}
        </Card>

        {/* Self-employment profit */}
        <Card tone="success">
          <p className="text-sm font-bold text-textPrimary">{num('profit') < 0 ? 'Self-employment loss' : 'Self-employment profit'}</p>
          <p className="mt-1 text-sm font-bold text-textPrimary">{money(num('profit'))}</p>
          <p className="mt-1 text-xs text-textSecondary">
            Income minus allowable expenses. Losses are shown here, but this estimator does not claim loss relief automatically.
          </p>
        </Card>
      </div>

      {/* Upcoming HMRC Payments */}
      <Card className="mt-4">
        <p className="text-sm font-bold text-textPrimary">📅 Upcoming HMRC Payments</p>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-textSecondary">{janDate}</p>
            <p className="text-xs text-textMuted">Balancing payment + 1st payment on account</p>
          </div>
          <p className="text-base font-bold text-textPrimary">{money(january)}</p>
        </div>
        {july > 0.005 && (
          <>
            <div className="my-2.5 h-px bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-textSecondary">{julDate}</p>
                <p className="text-xs text-textMuted">2nd payment on account</p>
              </div>
              <p className="text-base font-bold text-textPrimary">{money(july)}</p>
            </div>
          </>
        )}
        <p className="mt-2.5 text-xs text-textMuted">
          Estimates — payments on account can be reduced if lower profit is expected next year, but interest applies if
          reduced too far and profit doesn&rsquo;t drop.
        </p>
      </Card>

      {/* Registration thresholds — only shown if actually exceeded */}
      {(bool('exceedsVatThreshold') || bool('exceedsMtdIncomeTaxThreshold')) && (
        <Card tone="warning" className="mt-4">
          <p className="text-sm font-bold text-textPrimary">⚠️ Registration thresholds</p>
          {bool('exceedsVatThreshold') && (
            <div className="mt-3">
              <p className="text-sm font-bold text-warning">
                Self-employment turnover this tax year is over £90,000 — the VAT registration threshold.
              </p>
              <p className="mt-1 text-xs text-textSecondary">
                HMRC&rsquo;s real test is a rolling 12-month check on business turnover, not this tax-year figure — this
                is a heads-up, not a registration deadline.
              </p>
            </div>
          )}
          {bool('exceedsMtdIncomeTaxThreshold') && (
            <div className="mt-3">
              <p className="text-sm font-bold text-warning">
                Self-employment income this tax year is over {money(summary.mtdIncomeTaxThreshold)} — the Making Tax
                Digital for Income Tax qualifying income threshold.
              </p>
              <p className="mt-1 text-xs text-textSecondary">
                HMRC decides mandation from an earlier tax year&rsquo;s return, so this doesn&rsquo;t confirm quarterly
                filing is required this year.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* HMRC Tax Breakdown — same conditional rows, same order as the app */}
      <Card className="mt-4">
        <p className="mb-4 text-sm font-bold text-textPrimary">HMRC Tax Breakdown</p>
        {bool('useTradingAllowance') && (
          <p className="mb-3 text-xs font-semibold text-textSecondary">
            Trading Allowance (£1,000) applied instead of actual expenses — taxable income below may differ from the
            Self-employment profit shown above.
          </p>
        )}
        {hasValue(summary.homeOfficeDeduction) && (
          <p className="mb-3 text-xs font-semibold text-textSecondary">
            Use of Home as Office ({money(summary.homeOfficeDeduction)}) is already included in the Self-employment
            profit shown above.
          </p>
        )}
        {showPaye && (
          <>
            <BreakRow title="PAYE employment income" value={money(summary.payeSalary)} />
            <BreakRow title="PAYE tax already paid" value={signedMoney(-num('payeTaxPaid'))} />
          </>
        )}
        <BreakRow title="Taxable income" value={money(summary.combinedIncome)} />
        <BreakRow title="Income Tax" value={money(summary.incomeTax)} />
        {showMarriageAllowance && (
          <BreakRow title="Marriage Allowance reduction" value={signedMoney(-num('marriageAllowanceReduction'))} />
        )}
        <BreakRow title="Class 2 National Insurance" value={money(summary.class2Ni)} />
        <BreakRow title="Class 4 National Insurance" value={money(summary.class4Ni)} />
        {showMileage && <BreakRow title="Mileage deduction included" value={signedMoney(-num('mileageClaim'))} />}
        {showCis && <BreakRow title="CIS suffered" value={signedMoney(-num('cisSuffered'))} />}
        {showStudentLoan && <BreakRow title="Student Loan repayment" value={money(summary.studentLoanRepayment)} />}
        {showPaymentOnAccount && <BreakRow title="Estimated payments on account" value={money(summary.paymentOnAccount)} />}
        <BreakRow title="Estimated payable" value={money(summary.finalTax)} />
        {showRefund && <BreakRow title="Estimated refund / overpaid" value={money(summary.refundEstimate)} />}
        <p className="text-xs font-bold text-textPrimary">Estimate only • Review before filing</p>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-bold text-success">SA readiness</p>
          <p className="mt-1 text-sm font-bold text-success">{num('readiness')}% ready for filing</p>
          <p className="mt-2 text-xs font-bold text-success">
            {num('readiness') >= 80 ? 'Excellent records quality' : 'Improve records before filing'}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-success">Records summary</p>
          <p className="mt-1 text-xs font-bold text-success">{summary.recordCount as number} transactions</p>
          <p className="text-xs font-bold text-success">{summary.receiptCount as number} receipts</p>
          <p className="text-xs font-bold text-success">{summary.invoiceCount as number} invoices analysed</p>
          <p className="text-xs font-bold text-success">{summary.mileageTrips as number} mileage trips</p>
        </Card>
        <Card>
          <p className="text-sm font-bold text-textPrimary">Vehicle summary</p>
          <p className="mt-1 text-xs font-semibold text-textSecondary">
            {String(summary.vehicleNote ?? '').trim() || 'Vehicle method not configured'}
          </p>
        </Card>
      </div>
    </div>
  );
}
