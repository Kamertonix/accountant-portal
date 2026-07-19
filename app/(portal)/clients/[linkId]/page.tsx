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
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Card from '@/components/Card';
import Avatar from '@/components/Avatar';
import StatusBadge from '@/components/StatusBadge';
import SummaryCards from '@/components/SummaryCards';
import CategoryTable from '@/components/CategoryTable';
import SelfAssessmentSummary from '@/components/SelfAssessmentSummary';
import PeriodSelector from '@/components/PeriodSelector';
import { usePortal } from '@/lib/portal-context';
import { isWithinRange, rangeForOption, type PeriodOption } from '@/lib/period';
import {
  ACCOUNTANT_CATEGORIES,
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
};

const CATEGORY_BLURBS: Record<AccountantCategory, string> = {
  transactions: 'All income and expenses',
  invoices: 'Issued invoices and their status',
  expenses: 'Recorded business expenses',
  vat: 'VAT-flagged records',
  cis: 'CIS-flagged records',
  mileage: 'Business mileage log',
  documents: 'Organizer documents (not yet synced)',
  self_assessment: "The app's own tax estimate",
};

function ClientDetailContent() {
  const params = useParams<{ linkId: string }>();
  const { links, activeCategoryTab, setActiveClientTab } = usePortal();
  const link = links.find((l) => l.id === params.linkId) ?? null;

  const activeTab: 'overview' | AccountantCategory = (activeCategoryTab as 'overview' | AccountantCategory) ?? 'overview';

  function setActiveTab(tab: 'overview' | AccountantCategory) {
    setActiveClientTab(params.linkId, tab);
  }

  const [snapshots, setSnapshots] = useState<Record<string, AccountantDataSnapshotRow>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodOption>({ kind: 'all' });
  const loggedRef = useRef<Set<string>>(new Set());

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
    setPeriod({ kind: 'all' });
    (async () => {
      const { data } = await supabase
        .from('accountant_data_snapshots')
        .select('*')
        .eq('user_id', link.user_id)
        .in('category', granted.length > 0 ? granted : ['__none__']);
      if (cancelled) return;
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
  const periodRange = referenceSnapshot ? rangeForOption(period, referenceSnapshot.period_from ?? '') : null;

  const filteredTxItems = txItems && periodRange ? txItems.filter((item) => isWithinRange(item.date, periodRange)) : txItems;
  const activeSnapshotItems = (activeSnapshot?.payload.items as Record<string, unknown>[] | undefined) ?? [];
  const filteredActiveItems =
    periodRange && activeTab !== 'self_assessment'
      ? activeSnapshotItems.filter((item) => isWithinRange(item.date, periodRange))
      : activeSnapshotItems;

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
          {ACCOUNTANT_CATEGORIES.filter((c) => granted.includes(c)).map((category) => (
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
        {referenceSnapshot?.period_from && referenceSnapshot?.period_to && activeTab !== 'self_assessment' && (
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
        ) : activeTab === 'overview' ? (
          <>
            <SummaryCards items={filteredTxItems} />
            <p className="mb-3 text-sm font-bold text-textPrimary">Client workspace</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ACCOUNTANT_CATEGORIES.filter((c) => granted.includes(c)).map((category) => {
                const Icon = CATEGORY_ICONS[category];
                const synced = Boolean(snapshots[category]);
                return (
                  <button key={category} onClick={() => setActiveTab(category)} className="text-left">
                    <Card className="h-full transition hover:-translate-y-0.5 hover:border-accentStroke">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accentLight">
                        <Icon size={18} />
                      </div>
                      <p className="mt-3 font-semibold text-textPrimary">{CATEGORY_LABELS[category]}</p>
                      <p className="mt-0.5 text-xs text-textMuted">{CATEGORY_BLURBS[category]}</p>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-textMuted">{synced ? 'Read only' : 'Not synced yet'}</span>
                        <span className="font-semibold text-accentLight">View →</span>
                      </div>
                    </Card>
                  </button>
                );
              })}
            </div>
          </>
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
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-textMuted">
              <span>Data as of: {new Date(activeSnapshot.synced_at).toLocaleString()}</span>
              {activeSnapshot.period_from && activeSnapshot.period_to && (
                <span>
                  Synced period: {activeSnapshot.period_from} → {activeSnapshot.period_to}
                </span>
              )}
              <span>{activeSnapshot.business_only ? 'Business records only' : 'All records'}</span>
              {period.kind !== 'all' && (
                <span className="font-semibold text-accentLight">
                  Showing {filteredActiveItems.length} of {activeSnapshotItems.length} records for selected period
                </span>
              )}
            </div>
            <CategoryTable
              category={activeTab as AccountantCategory}
              items={filteredActiveItems}
              clientLabel={link.client_label}
              clientUserId={link.user_id}
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