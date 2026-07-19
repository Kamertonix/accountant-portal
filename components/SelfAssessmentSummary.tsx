import Card from './Card';

function money(n: unknown): string {
  const value = Number(n) || 0;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}

interface Props {
  summary: Record<string, unknown>;
  syncedAt: string;
}

/// Renders the app's OWN computed Self Assessment estimate — nothing
/// here is calculated in the portal. Deliberately labelled "estimate"
/// everywhere, matching how the app itself frames this figure to the
/// user, so it's never mistaken for a filed or final return.
export default function SelfAssessmentSummary({ summary, syncedAt }: Props) {
  const readiness = Number(summary.readiness) || 0;

  return (
    <div>
      <Card tone="warning" className="mb-6">
        <p className="text-sm text-textSecondary">
          This is the app&rsquo;s own estimate for tax year <strong>{String(summary.taxYear)}</strong>, calculated on the
          client&rsquo;s device — not a filed or final return. Synced {new Date(syncedAt).toLocaleString()}.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Profit</p>
          <p className="mt-1 text-2xl font-bold text-textPrimary">{money(summary.profit)}</p>
        </Card>
        <Card tone="danger">
          <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Income tax (est.)</p>
          <p className="mt-1 text-2xl font-bold text-textPrimary">{money(summary.incomeTax)}</p>
        </Card>
        <Card tone="danger">
          <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Class 2 + 4 NI (est.)</p>
          <p className="mt-1 text-2xl font-bold text-textPrimary">
            {money((Number(summary.class2Ni) || 0) + (Number(summary.class4Ni) || 0))}
          </p>
        </Card>
        <Card tone={Number(summary.finalTax) >= 0 ? 'danger' : 'success'}>
          <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">
            {Number(summary.finalTax) >= 0 ? 'Estimated to pay' : 'Estimated refund'}
          </p>
          <p className="mt-1 text-2xl font-bold text-textPrimary">{money(Math.abs(Number(summary.finalTax) || 0))}</p>
        </Card>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card padded={false} className="p-4">
          <p className="text-xs text-textMuted">Payments on account</p>
          <p className="mt-1 text-sm font-semibold text-textPrimary">
            Jan {money(summary.januaryPayment)} &middot; Jul {money(summary.julyPayment)}
          </p>
        </Card>
        <Card padded={false} className="p-4">
          <p className="text-xs text-textMuted">Suggested reserve</p>
          <p className="mt-1 text-sm font-semibold text-textPrimary">{money(summary.suggestedReserve)}</p>
        </Card>
        <Card padded={false} className="p-4">
          <p className="text-xs text-textMuted">Records / receipts / invoices</p>
          <p className="mt-1 text-sm font-semibold text-textPrimary">
            {String(summary.recordCount ?? 0)} / {String(summary.receiptCount ?? 0)} / {String(summary.invoiceCount ?? 0)}
          </p>
        </Card>
        <Card padded={false} className="p-4">
          <p className="text-xs text-textMuted">Data readiness</p>
          <p className="mt-1 text-sm font-semibold text-textPrimary">{readiness}%</p>
        </Card>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-textMuted">
        {summary.cisEnabled === true && <span className="rounded-full border border-border px-2.5 py-1">CIS suffered: {money(summary.cisSuffered)}</span>}
        {summary.payeEnabled === true && <span className="rounded-full border border-border px-2.5 py-1">PAYE salary: {money(summary.payeSalary)}</span>}
        {summary.studentLoanEnabled === true && (
          <span className="rounded-full border border-border px-2.5 py-1">Student loan: {money(summary.studentLoanRepayment)}</span>
        )}
        {Number(summary.homeOfficeDeduction) > 0 && (
          <span className="rounded-full border border-border px-2.5 py-1">Home office: {money(summary.homeOfficeDeduction)}</span>
        )}
        {Number(summary.marriageAllowanceReduction) > 0 && (
          <span className="rounded-full border border-border px-2.5 py-1">
            Marriage allowance: -{money(summary.marriageAllowanceReduction)}
          </span>
        )}
        {summary.vatRegistered === true && <span className="rounded-full border border-border px-2.5 py-1">VAT registered</span>}
      </div>
    </div>
  );
}
