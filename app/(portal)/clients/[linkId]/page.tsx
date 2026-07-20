'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  ArrowRightLeft,
  FileText,
  Receipt,
  Landmark,
  HardHat,
  Car,
  Folder,
  Lock,
  Calculator,
  UserRound,
  ListChecks,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Card from '@/components/Card';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';
import SummaryCards from '@/components/SummaryCards';
import CategoryTable from '@/components/CategoryTable';
import FilteredTotals from '@/components/FilteredTotals';
import SelfAssessmentSummary from '@/components/SelfAssessmentSummary';
import BusinessProfile from '@/components/BusinessProfile';
import DeadlineCards from '@/components/DeadlineCards';
import MtdReport from '@/components/MtdReport';
import VatReturn from '@/components/VatReturn';
import InvoicesCard from '@/components/InvoicesCard';
import PeriodSelector from '@/components/PeriodSelector';
import { usePortal } from '@/lib/portal-context';
import { isWithinRange, rangeForOption, type PeriodOption } from '@/lib/period';
import { taxYearLabel } from '@/lib/download';
import {
  CATEGORY_LABELS,
  grantedCategories,
  type AccountantCategory,
  type AccountantDataSnapshotRow,
} from '@/lib/types';

const CATEGORY_ICONS: Record<AccountantCategory, typeof ArrowRightLeft> = {
  transactions: ArrowRightLeft,
  invoices: FileText,
  expenses: Receipt,
  vat: Landmark,
  cis: HardHat,
  mileage: Car,
  documents: Folder,
  self_assessment: Calculator,
  business_profile: UserRound,
  deadlines: Calculator,
  tasks: ListChecks,
  mtd_report: Landmark,
  vat_return: Landmark,
};

const VISIBLE_TABS: AccountantCategory[] = [
  'transactions',
  'invoices',
  'mileage',
  'self_assessment',
  'business_profile',
  'deadlines',
  'mtd_report',
  'vat_return',
];

type TypeFilter = 'all' | 'Income' | 'Expense' | 'vat' | 'cis';

const CATEGORY_BLURBS: Record<AccountantCategory, string> = {
  transactions: 'Income, expenses, VAT and CIS — filterable',
  invoices: 'Issued invoices and their status',
  expenses: 'Recorded business expenses',
  vat: 'VAT-flagged records',
  cis: 'CIS-flagged records',
  mileage: 'Business mileage log',
  documents: 'Organizer documents (not yet synced)',
  self_assessment: "The app's own tax estimate",
  business_profile: 'Name, address, UTR, NINO, VAT/CIS status',
  deadlines: 'Upcoming HMRC deadlines',
  tasks: "Client's organizer task list",
  mtd_report: "The app's own MTD quarterly report",
  vat_return: "The app's own 9-box VAT return",
};

function ClientDetailContent() {
  const params = useParams<{ linkId: string }>();
  const { links, activeCategoryTab, setActiveClientTab, pendingTypeFilter, pendingPeriod, setPendingFilter } = usePortal();
  const link = links.find((l) => l.id === params.linkId) ?? null;

  const activeTab: 'overview' | AccountantCategory = (activeCategoryTab as 'overview' | AccountantCategory) ?? 'overview';

  function setActiveTab(tab: 'overview' | AccountantCategory) {
    setActiveClientTab(params.linkId, tab);
  }

  const [snapshots, setSnapshots] = useState<Record<string, AccountantDataSnapshotRow>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodOption>({ kind: 'all' });
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const loggedRef = useRef<Set<string>>(new Set());

  // A sidebar shortcut (VAT Return / MTD Report) sets a one-shot
  // "pending" filter in the shared context right before switching to
  // this tab — apply it once, then clear it, so it doesn't keep
  // overriding the user's own filter choices afterwards.
  useEffect(() => {
    if (activeCategoryTab !== 'transactions') return;
    if (pendingTypeFilter === null && pendingPeriod === null) return;
    if (pendingTypeFilter !== null) setTypeFilter(pendingTypeFilter);
    if (pendingPeriod !== null) setPeriod(pendingPeriod);
    setPendingFilter(null, null);
  }, [activeCategoryTab, pendingTypeFilter, pendingPeriod, setPendingFilter]);

  const granted = useMemo(() => (link ? grantedCategories(link) : []), [link]);

  // Registers this client as "active" in the shared context so the
  // sidebar can show its category shortcuts + mini client card —
  // cleared on unmount so the sidebar doesn't keep showing a stale
  // client's categories after navigating away.
  useEffect(() => {
    setActiveClientTab(params.linkId, 'overview');
    return () => setActiveClientTab(null, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.linkId]);

  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    setLoading(true);
    setSnapshots({});
    setFetchError(null);
    setPeriod({ kind: 'all' });
    setTypeFilter('all');
    (async () => {
      const { data, error } = await supabase
        .from('accountant_data_snapshots')
        .select('*')
        .eq('user_id', link.user_id)
        .in('category', granted.length > 0 ? granted : ['__none__']);
      if (cancelled) return;
      if (error) {
        console.error('Error loading snapshots:', error);
        setFetchError(error.message);
        setLoading(false);
        return;
      }
      const map: Record<string, AccountantDataSnapshotRow> = {};
      for (const row of (data as AccountantDataSnapshotRow[]) ?? []) map[row.category] = row;
      setSnapshots(map);
      setLoading(false);

      for (const row of Object.values(map)) {
        const key = `${link.id}:${row.category}`;
        if (!loggedRef.current.has(key)) {
          loggedRef.current.add(key);
          supabase.functions
            .invoke('accountant-log-access', { body: { user_id: link.user_id, category: row.category } })
            .catch(() => {});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link?.id]);

  if (!link) {
    return <div className="flex h-screen items-center justify-center text-textMuted">Client not found.</div>;
  }
  if (link.status !== 'accepted') {
    return <div className="flex h-screen items-center justify-center text-textMuted">Waiting for client approval.</div>;
  }

  const txSnapshot = snapshots['transactions'];
  const txItems = (txSnapshot?.payload.items as Record<string, unknown>[] | undefined) ?? null;
  const activeSnapshot = activeTab !== 'overview' ? snapshots[activeTab] : null;

  // Every category syncs against the same tax-year window, so any
  // available snapshot's period_from anchors the quarter/month split —
  // prefer the active one, fall back to transactions for the Overview
  // tab (which shows the summary cards, not a specific category table).
  const referenceSnapshot = activeSnapshot ?? txSnapshot;
  const currentTaxYear = taxYearLabel(referenceSnapshot?.period_from);
  const periodRange = referenceSnapshot ? rangeForOption(period, referenceSnapshot.period_from ?? '') : null;

  const filteredTxItems = txItems && periodRange ? txItems.filter((item) => isWithinRange(item.date, periodRange)) : txItems;
  const activeSnapshotItems = (activeSnapshot?.payload.items as Record<string, unknown>[] | undefined) ?? [];
  const filteredActiveItems =
    periodRange && activeTab !== 'self_assessment' && activeTab !== 'business_profile' && activeTab !== 'tasks' && activeTab !== 'deadlines' && activeTab !== 'mtd_report' && activeTab !== 'vat_return'
      ? activeSnapshotItems.filter((item) => isWithinRange(item.date, periodRange))
      : activeSnapshotItems;

  const displayedItems =
    activeTab === 'transactions' && typeFilter !== 'all'
      ? filteredActiveItems.filter((item) => {
          if (typeFilter === 'Income' || typeFilter === 'Expense') return item.type === typeFilter;
          if (typeFilter === 'vat') return item.vat === true;
          if (typeFilter === 'cis') return item.cis === true;
          return true;
        })
      : filteredActiveItems;

  return (
    <div className="p-8">
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accentLight hover:underline">
        <ArrowLeft size={15} /> Back to clients
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={link.client_label || '?'} size={52} />
          <div>
            <h1 className="text-xl font-bold text-textPrimary">{link.client_label || 'Unnamed client'}</h1>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-textMuted">
              <StatusBadge status={link.status} />
              <span>
                Client since {link.accepted_at ? new Date(link.accepted_at).toLocaleDateString() : '—'}
              </span>
              <span>
                &middot; Last sync:{' '}
                {Object.values(snapshots).length > 0
                  ? new Date(Math.max(...Object.values(snapshots).map((s) => new Date(s.synced_at).getTime()))).toLocaleString()
                  : 'Never'}
              </span>
            </div>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-lg border border-accentStroke px-3 py-1.5 text-xs font-semibold text-accentLight">
          <Eye size={14} /> Accountant view
        </span>
      </div>

      <Card tone="accent" className="mt-5 flex items-center gap-3">
        <Lock size={16} className="shrink-0 text-accentLight" />
        <p className="text-sm text-textSecondary">
          You&rsquo;re in read-only view. You can monitor all shared data and export it — nothing can be created,
          edited, or deleted from here, and every view is logged for your client to see.
        </p>
      </Card>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'overview' ? 'bg-accent text-white' : 'border border-border bg-input text-textSecondary hover:border-accentStroke'
            }`}
          >
            Overview
          </button>
          {VISIBLE_TABS.filter((c) => granted.includes(c)).map((category) => (
            <button
              key={category}
              onClick={() => setActiveTab(category)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === category ? 'bg-accent text-white' : 'border border-border bg-input text-textSecondary hover:border-accentStroke'
              }`}
            >
              {CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
        {referenceSnapshot?.period_from && referenceSnapshot?.period_to && activeTab !== 'self_assessment' && activeTab !== 'business_profile' && activeTab !== 'tasks' && activeTab !== 'deadlines' && activeTab !== 'mtd_report' && activeTab !== 'vat_return' && (
          <PeriodSelector
            periodFromIso={referenceSnapshot.period_from}
            periodToIso={referenceSnapshot.period_to}
            value={period}
            onChange={setPeriod}
          />
        )}
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-textMuted">Loading…</p>
        ) : fetchError ? (
          <Card tone="danger">
            <p className="text-sm font-semibold text-danger">Could not load data</p>
            <p className="mt-1 text-xs text-textMuted">{fetchError}</p>
          </Card>
        ) : activeTab === 'overview' ? (
          <SummaryCards items={filteredTxItems} />
        ) : !activeSnapshot ? (
          <Card tone="warning">
            <p className="text-sm text-textSecondary">
              No data synced yet for this category. Ask your client to press &ldquo;Sync now&rdquo; in their
              Accountant Access screen.
            </p>
          </Card>
        ) : activeTab === 'self_assessment' ? (
          <SelfAssessmentSummary
            summary={(activeSnapshot.payload.summary as Record<string, unknown>) ?? {}}
            syncedAt={activeSnapshot.synced_at}
          />
        ) : activeTab === 'business_profile' ? (
          <BusinessProfile profile={(activeSnapshot.payload.profile as Record<string, unknown>) ?? {}} syncedAt={activeSnapshot.synced_at} />
        ) : activeTab === 'deadlines' ? (
          <DeadlineCards
            items={
              (activeSnapshot.payload.items as unknown as {
                key: string;
                typeKey: string;
                title: string;
                description: string;
                deadline: string;
                daysRemaining: number;
              }[]) ?? []
            }
          />
        ) : activeTab === 'mtd_report' ? (
          <MtdReport
            quarters={
              (activeSnapshot.payload.quarters as unknown as {
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
              }[]) ?? []
            }
          />
        ) : activeTab === 'vat_return' ? (
          <VatReturn
            periods={
              (activeSnapshot.payload.periods as unknown as {
                period: string;
                boxes: {
                  box1: number;
                  box2: number;
                  box3: number;
                  box4: number;
                  box5: number;
                  box6: number;
                  box7: number;
                  box8: number;
                  box9: number;
                };
                statement?: {
                  scheme: string;
                  isFlatRate: boolean;
                  flatRatePercent: number;
                  totalNetSales: number;
                  totalVatOnSales: number;
                  totalNetPurchases: number;
                  totalVatOnPurchases: number;
                  entries: {
                    date: string;
                    description: string;
                    type: string;
                    netAmount: number;
                    vatAmount: number;
                    grossAmount: number;
                    excludedFromReturn: boolean;
                  }[];
                };
              }[]) ?? []
            }
            clientUserId={link.user_id}
            clientLabel={link.client_label}
            taxYear={currentTaxYear}
          />
        ) : activeTab === 'invoices' ? (
          <InvoicesCard
            items={
              displayedItems as unknown as {
                id?: string;
                number: string;
                client: string;
                date: string;
                dueDate: string;
                status: string;
                netAmount: number;
                vatAmount: number;
                cisAmount: number;
                paidAmount: number;
              }[]
            }
            clientUserId={link.user_id}
            clientLabel={link.client_label}
            issuer={(snapshots['business_profile']?.payload.profile as Record<string, unknown>) ?? null}
            taxYear={currentTaxYear}
          />
        ) : (
          <>
            {activeTab === 'transactions' && Number(activeSnapshot.payload.reviewCount ?? 0) > 0 && (
              <Card tone="warning" className="mb-4">
                <p className="text-sm text-textSecondary">
                  <span className="font-bold text-warning">{Number(activeSnapshot.payload.reviewCount)}</span> transaction
                  {Number(activeSnapshot.payload.reviewCount) === 1 ? '' : 's'} awaiting classification (Business/Personal) by
                  your client — not shown here until they&rsquo;re classified, since they might turn out to be personal.
                </p>
              </Card>
            )}
            {activeTab === 'transactions' && (
              <div className="mb-4 flex flex-wrap gap-2">
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'Income', label: 'Income' },
                    { key: 'Expense', label: 'Expense' },
                    ...(link.can_view_vat ? [{ key: 'vat', label: 'VAT' } as const] : []),
                    ...(link.can_view_cis ? [{ key: 'cis', label: 'CIS' } as const] : []),
                  ] as { key: TypeFilter; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setTypeFilter(opt.key)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      typeFilter === opt.key
                        ? 'bg-accent text-white'
                        : 'border border-border bg-input text-textSecondary hover:border-accentStroke'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            {activeTab === 'transactions' && (
              <FilteredTotals
                items={displayedItems}
                label={typeFilter === 'all' ? 'All transactions' : typeFilter === 'vat' ? 'VAT' : typeFilter === 'cis' ? 'CIS' : typeFilter}
              />
            )}
            <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-textMuted">
              <span>Data as of: {new Date(activeSnapshot.synced_at).toLocaleString()}</span>
              {activeSnapshot.period_from && activeSnapshot.period_to && (
                <span>
                  Synced period: {activeSnapshot.period_from} → {activeSnapshot.period_to}
                </span>
              )}
              <span>{activeSnapshot.business_only ? 'Business records only' : 'All records'}</span>
              {(period.kind !== 'all' || typeFilter !== 'all') && (
                <span className="font-semibold text-accentLight">
                  Showing {displayedItems.length} of {activeSnapshotItems.length} records
                </span>
              )}
            </div>
            <CategoryTable
              category={activeTab as AccountantCategory}
              items={displayedItems}
              clientLabel={link.client_label}
              clientUserId={link.user_id}
              taxYear={currentTaxYear}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  return <ClientDetailContent />;
}