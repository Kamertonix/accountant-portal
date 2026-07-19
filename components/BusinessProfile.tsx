import Card from './Card';

function money(n: unknown): string {
  const value = Number(n) || 0;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-textMuted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-textPrimary">{value || '—'}</p>
    </div>
  );
}

function YesNoTag({ yes }: { yes: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${yes ? 'bg-success/15 text-success' : 'bg-input text-textMuted'}`}>
      {yes ? 'Yes' : 'No'}
    </span>
  );
}

export default function BusinessProfile({ profile, syncedAt }: { profile: Record<string, unknown>; syncedAt: string }) {
  const str = (key: string) => (profile[key] ? String(profile[key]) : '');
  const bool = (key: string) => profile[key] === true;
  const name = `${str('firstName')} ${str('surname')}`.trim();
  const addressParts = [str('addressLine1'), str('addressLine2'), str('city'), str('postcode'), str('country')].filter(Boolean);

  return (
    <div>
      <Card className="mb-4">
        <p className="text-xs text-textMuted">Synced {new Date(syncedAt).toLocaleString()} &mdash; current profile and settings, not a dated record.</p>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <p className="mb-3 text-sm font-bold text-textPrimary">Identity</p>
          <div className="flex flex-col gap-3">
            <Field label="Name" value={name} />
            <Field label="Business name" value={str('businessName')} />
            <Field label="Business type" value={str('businessType')} />
            <Field label="UTR" value={str('utr')} />
            <Field label="NINO" value={str('nino')} />
          </div>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-bold text-textPrimary">Contact &amp; address</p>
          <div className="flex flex-col gap-3">
            <Field label="Email" value={str('email')} />
            <Field label="Phone" value={str('phone')} />
            <Field label="Address" value={addressParts.join(', ')} />
          </div>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-bold text-textPrimary">VAT</p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-textMuted">Registered</p>
              <YesNoTag yes={bool('vatRegistered')} />
            </div>
            {bool('vatRegistered') && (
              <>
                <Field label="VAT number" value={str('vatNumber')} />
                <Field label="Scheme" value={str('vatScheme')} />
                <Field label="Frequency" value={str('vatFrequency')} />
                <Field label="Quarter start" value={str('vatQuarterStart')} />
                {str('flatRatePercent') && <Field label="Flat rate %" value={str('flatRatePercent')} />}
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-textMuted">Reverse charge VAT</p>
                  <YesNoTag yes={bool('reverseChargeVat')} />
                </div>
              </>
            )}
          </div>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-bold text-textPrimary">CIS</p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-textMuted">Registered</p>
              <YesNoTag yes={bool('cisRegistered')} />
            </div>
            {bool('cisRegistered') && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-textMuted">Subcontractor</p>
                  <YesNoTag yes={bool('cisSubcontractor')} />
                </div>
                <Field label="Type" value={str('cisType')} />
              </>
            )}
          </div>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-bold text-textPrimary">PAYE employment</p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-textMuted">Has PAYE income</p>
              <YesNoTag yes={bool('payeEnabled')} />
            </div>
            {bool('payeEnabled') && (
              <>
                <Field label="Salary" value={money(profile.payeSalary)} />
                <Field label="Tax paid" value={money(profile.payeTaxPaid)} />
                <Field label="NIC paid" value={money(profile.payeNicPaid)} />
              </>
            )}
          </div>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-bold text-textPrimary">Student loan</p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-textMuted">Has student loan</p>
              <YesNoTag yes={bool('studentLoanEnabled')} />
            </div>
            {bool('studentLoanEnabled') && <Field label="Plan" value={str('studentLoanPlan')} />}
          </div>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-bold text-textPrimary">Allowances</p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-textMuted">Trading allowance</p>
              <YesNoTag yes={bool('useTradingAllowance')} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-textMuted">Marriage allowance</p>
              <YesNoTag yes={bool('claimMarriageAllowance')} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-textMuted">Use home as office</p>
              <YesNoTag yes={bool('homeOfficeEnabled')} />
            </div>
            {bool('homeOfficeEnabled') && (
              <>
                <Field label="Hours band" value={str('homeOfficeHoursBand')} />
                <Field label="Months claimed" value={str('homeOfficeMonths')} />
              </>
            )}
          </div>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-bold text-textPrimary">Vehicle &amp; mileage</p>
          <div className="flex flex-col gap-3">
            <Field label="Expense method" value={str('vehicleExpenseMethod')} />
            <Field label="Vehicle type" value={str('vehicleType')} />
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-textMuted">Drives for Bolt</p>
              <YesNoTag yes={bool('boltDriver')} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
