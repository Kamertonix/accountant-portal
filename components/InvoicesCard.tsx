'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportPath, downloadBlob } from '@/lib/download';
import Card from './Card';
import InvoiceDetailModal from './InvoiceDetailModal';

interface Invoice {
  id?: string;
  number: string;
  client: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientUtr?: string;
  clientVat?: string;
  description?: string;
  date: string;
  dueDate: string;
  status: string;
  netAmount: number;
  vatAmount: number;
  cisAmount: number;
  paidAmount: number;
  lines?: unknown[];
  payments?: unknown[];
}

function money(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function ukDate(text: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return text || '—';
}

// Exact same formulas as StoredInvoice's getters in the app
// (storage_models.dart) — replicated arithmetic on already-synced
// fields, not a new calculation invented for the portal.
function computed(inv: Invoice) {
  const total = inv.netAmount + inv.vatAmount;
  const amountDue = total - inv.cisAmount;
  const remaining = Math.max(0, amountDue - inv.paidAmount);
  const isPaid = inv.status === 'Paid' || (amountDue > 0 && inv.paidAmount >= amountDue);
  const isDraft = inv.status === 'Draft';
  const isCancelled = inv.status.toLowerCase().includes('cancel');
  const isOverdue = (() => {
    if (isPaid || isDraft || isCancelled) return false;
    const due = new Date(inv.dueDate);
    if (Number.isNaN(due.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due.getTime() < today.getTime();
  })();
  const displayStatus = isOverdue ? 'Overdue' : inv.status;
  return { total, amountDue, remaining, isPaid, isDraft, isOverdue, displayStatus };
}

const FILTERS = ['All', 'Draft', 'Sent', 'Viewed', 'Paid', 'Overdue'];

function PdfButton({
  clientUserId,
  invoiceId,
  clientLabel,
  taxYear,
}: {
  clientUserId: string;
  invoiceId: string;
  clientLabel: string;
  taxYear: string;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleDownload() {
    setBusy(true);
    setFailed(false);
    try {
      const path = `${clientUserId}/${invoiceId}.pdf`;
      const { data, error } = await supabase.storage.from('accountant-invoices').download(path);
      if (error || !data) throw error ?? new Error('No file');
      downloadBlob(data, exportPath(clientLabel, taxYear, 'Invoices', `invoice-${invoiceId}.pdf`));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={busy}
      title={failed ? 'Not available — ask your client to sync' : 'Download PDF'}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-textSecondary transition hover:border-accentStroke hover:text-textPrimary disabled:opacity-50"
    >
      <Download size={13} />
      {failed ? 'Unavailable' : busy ? '…' : 'PDF'}
    </button>
  );
}

/// Mirrors the app's own "Saved invoices" section on the Invoices
/// screen (invoices_screen.dart) — same three summary cards, same
/// filter chips, same per-invoice status logic. Every number is the
/// exact same formula the app itself uses on the same synced fields.
export default function InvoicesCard({
  items,
  clientUserId,
  clientLabel,
  issuer,
  taxYear,
}: {
  items: Invoice[];
  clientUserId: string;
  clientLabel: string;
  issuer: Record<string, unknown> | null;
  taxYear: string;
}) {
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState<Invoice | null>(null);

  const withComputed = useMemo(() => items.map((inv) => ({ inv, c: computed(inv) })), [items]);

  const outstanding = withComputed
    .filter(({ c }) => !c.isPaid && !c.isDraft && !c.isOverdue)
    .reduce((sum, { c }) => sum + c.remaining, 0);
  const overdue = withComputed.filter(({ c }) => c.isOverdue).reduce((sum, { c }) => sum + c.remaining, 0);
  const paid = withComputed.filter(({ c }) => c.isPaid).reduce((sum, { c }) => sum + c.amountDue, 0);

  const filtered = withComputed.filter(({ inv, c }) => {
    if (filter === 'All') return true;
    if (filter === 'Overdue') return c.isOverdue;
    return c.displayStatus === filter || inv.status === filter;
  });

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-textMuted">No invoices in this category for the synced period.</p>;
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Outstanding</p>
          <p className="mt-1 text-xl font-bold text-textPrimary">{money(outstanding)}</p>
        </Card>
        <Card tone="danger">
          <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Overdue</p>
          <p className="mt-1 text-xl font-bold text-danger">{money(overdue)}</p>
        </Card>
        <Card tone="success">
          <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Paid</p>
          <p className="mt-1 text-xl font-bold text-success">{money(paid)}</p>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === f ? 'bg-accent text-white' : 'border border-border bg-input text-textSecondary hover:border-accentStroke'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-textMuted">No invoices match this filter.</p>
        ) : (
          filtered.map(({ inv, c }) => (
            <Card
              key={inv.number}
              className="flex cursor-pointer items-center justify-between gap-3 transition hover:border-accentStroke"
              onClick={() => setSelected(inv)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-textPrimary">{inv.number}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      c.isOverdue
                        ? 'bg-danger/15 text-danger'
                        : c.isPaid
                          ? 'bg-success/15 text-success'
                          : 'bg-accent/15 text-accentLight'
                    }`}
                  >
                    {c.displayStatus}
                  </span>
                </div>
                <p className="truncate text-xs text-textMuted">
                  {inv.client} &middot; {ukDate(inv.date)} &middot; Due {ukDate(inv.dueDate)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-textPrimary">{money(c.total)}</p>
              <div onClick={(e) => e.stopPropagation()}>
                <PdfButton
                  clientUserId={clientUserId}
                  invoiceId={String(inv.id ?? inv.number)}
                  clientLabel={clientLabel}
                  taxYear={taxYear}
                />
              </div>
            </Card>
          ))
        )}
      </div>

      {selected && (
        <InvoiceDetailModal
          invoice={selected as unknown as never}
          clientUserId={clientUserId}
          clientLabel={clientLabel}
          taxYear={taxYear}
          issuer={issuer}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
