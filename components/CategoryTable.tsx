'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportPath, downloadBlob } from '@/lib/download';
import { CATEGORY_LABELS, type AccountantCategory } from '@/lib/types';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'right';
  format?: (value: unknown) => string;
  badge?: boolean;
  pdfButton?: boolean;
}

const BADGE_PALETTE = [
  { bg: 'bg-accent/15', text: 'text-accentLight' },
  { bg: 'bg-success/15', text: 'text-success' },
  { bg: 'bg-warning/15', text: 'text-warning' },
  { bg: 'bg-danger/15', text: 'text-danger' },
  { bg: 'bg-purple-500/15', text: 'text-purple-300' },
  { bg: 'bg-pink-500/15', text: 'text-pink-300' },
];

function badgeStyleFor(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return BADGE_PALETTE[hash % BADGE_PALETTE.length];
}

function money(value: unknown): string {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function yesNo(value: unknown): string {
  return value === true ? 'Yes' : 'No';
}

function ukDate(value: unknown): string {
  const text = String(value ?? '');
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : text || '—';
}

// Exact field names, taken directly from the Dart toJson() methods this
// data comes from (StoredTransaction / StoredInvoice / StoredExpense /
// StoredMileageTrip) — not guessed. 'vat' and 'cis' snapshots reuse the
// transaction shape, since the app builds them by filtering
// transactions rather than a separate model.
const COLUMN_DEFS: Record<AccountantCategory, Column[]> = {
  transactions: [
    { key: 'date', label: 'Date', format: ukDate },
    { key: 'type', label: 'Type', badge: true },
    { key: 'cat', label: 'Category', badge: true },
    { key: 'desc', label: 'Description' },
    { key: 'amount', label: 'Amount', align: 'right', format: money },
    { key: 'vat', label: 'VAT', format: yesNo },
    { key: 'cis', label: 'CIS', format: yesNo },
  ],
  vat: [
    { key: 'date', label: 'Date', format: ukDate },
    { key: 'type', label: 'Type', badge: true },
    { key: 'cat', label: 'Category', badge: true },
    { key: 'desc', label: 'Description' },
    { key: 'amount', label: 'Amount', align: 'right', format: money },
  ],
  cis: [
    { key: 'date', label: 'Date', format: ukDate },
    { key: 'type', label: 'Type', badge: true },
    { key: 'cat', label: 'Category', badge: true },
    { key: 'desc', label: 'Description' },
    { key: 'amount', label: 'Amount', align: 'right', format: money },
  ],
  invoices: [
    { key: 'number', label: 'Invoice #' },
    { key: 'client', label: 'Client' },
    { key: 'date', label: 'Date', format: ukDate },
    { key: 'dueDate', label: 'Due', format: ukDate },
    { key: 'status', label: 'Status', badge: true },
    { key: 'netAmount', label: 'Net', align: 'right', format: money },
    { key: 'vatAmount', label: 'VAT', align: 'right', format: money },
    { key: 'cisAmount', label: 'CIS', align: 'right', format: money },
    { key: 'paidAmount', label: 'Paid', align: 'right', format: money },
    { key: '__pdf', label: 'PDF', pdfButton: true },
  ],
  expenses: [
    { key: 'date', label: 'Date', format: ukDate },
    { key: 'supplier', label: 'Supplier' },
    { key: 'category', label: 'Category', badge: true },
    { key: 'amount', label: 'Amount', align: 'right', format: money },
    { key: 'vat', label: 'VAT', format: yesNo },
    { key: 'cis', label: 'CIS', format: yesNo },
  ],
  mileage: [
    { key: 'date', label: 'Date', format: ukDate },
    { key: 'vehicleName', label: 'Vehicle' },
    { key: 'purpose', label: 'Purpose', badge: true },
    { key: 'from', label: 'From' },
    { key: 'to', label: 'To' },
    { key: 'miles', label: 'Miles', align: 'right' },
    { key: 'claim', label: 'Claim', align: 'right', format: money },
  ],
  documents: [],
  self_assessment: [],
  business_profile: [],
  deadlines: [],
  tasks: [],
  mtd_report: [],
  vat_return: [],
};

function toCsv(columns: Column[], rows: Record<string, unknown>[]): string {
  const escape = (value: unknown) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = columns.map((c) => escape(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => escape(row[c.key])).join(','));
  return [header, ...lines].join('\n');
}

function PdfDownloadButton({
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
      title={failed ? 'Not available yet — ask your client to sync' : 'Download PDF'}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-textSecondary transition hover:border-accentStroke hover:text-textPrimary disabled:opacity-50"
    >
      <Download size={13} />
      {failed ? 'Unavailable' : busy ? '…' : 'PDF'}
    </button>
  );
}

export default function CategoryTable({
  category,
  items,
  clientLabel,
  clientUserId,
  taxYear,
}: {
  category: AccountantCategory;
  items: Record<string, unknown>[];
  clientLabel: string;
  clientUserId: string;
  taxYear: string;
}) {
  const columns = COLUMN_DEFS[category];
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDesc, setSortDesc] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((row) => columns.some((c) => String(row[c.key] ?? '').toLowerCase().includes(q)));
  }, [items, query, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const an = Number(av);
      const bn = Number(bv);
      const cmp = !Number.isNaN(an) && !Number.isNaN(bn) ? an - bn : String(av ?? '').localeCompare(String(bv ?? ''));
      return sortDesc ? -cmp : cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDesc]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(false);
    }
    setPage(0);
  }

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  function handleExport() {
    const csvColumns = columns.filter((c) => !c.pdfButton);
    const csv = toCsv(csvColumns, sorted);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const filename = `${category}.csv`.toLowerCase();
    downloadBlob(blob, exportPath(clientLabel, taxYear, CATEGORY_LABELS[category], filename));
  }

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-textMuted">No records in this category for the synced period.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search…"
          className="w-64 rounded-lg border border-border bg-input px-3 py-2 text-sm text-textPrimary outline-none focus:border-accentStroke"
        />
        <button
          onClick={handleExport}
          className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-textSecondary transition hover:border-accentStroke hover:text-textPrimary"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-input text-left text-xs font-bold uppercase tracking-wide text-textMuted">
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={c.pdfButton ? undefined : () => toggleSort(c.key)}
                  className={`select-none whitespace-nowrap px-4 py-3 ${c.pdfButton ? '' : 'cursor-pointer hover:text-textPrimary'} ${c.align === 'right' ? 'text-right' : ''}`}
                >
                  {c.label}
                  {!c.pdfButton && sortKey === c.key && (sortDesc ? ' \u2193' : ' \u2191')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={String(row.id ?? i)} className="border-b border-border/50 last:border-0 hover:bg-white/[0.02]">
                {columns.map((c) => {
                  if (c.pdfButton) {
                    return (
                      <td key={c.key} className="whitespace-nowrap px-4 py-2.5">
                        <PdfDownloadButton
                          clientUserId={clientUserId}
                          invoiceId={String(row.id ?? '')}
                          clientLabel={clientLabel}
                          taxYear={taxYear}
                        />
                      </td>
                    );
                  }
                  const raw = row[c.key];
                  const text = c.format ? c.format(raw) : String(raw ?? '—');
                  return (
                    <td
                      key={c.key}
                      className={`whitespace-nowrap px-4 py-2.5 text-textSecondary ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}
                    >
                      {c.badge && text !== '—' ? (
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyleFor(text).bg} ${badgeStyleFor(text).text}`}
                        >
                          {text}
                        </span>
                      ) : (
                        text
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-textMuted">
        <span>
          Showing {sorted.length === 0 ? 0 : currentPage * pageSize + 1}–{Math.min(sorted.length, (currentPage + 1) * pageSize)}{' '}
          of {sorted.length}
        </span>
        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="rounded-lg border border-border px-2.5 py-1.5 font-semibold text-textSecondary disabled:opacity-30"
            >
              ‹
            </button>
            {Array.from({ length: pageCount }, (_, i) => i)
              .filter((i) => i === 0 || i === pageCount - 1 || Math.abs(i - currentPage) <= 1)
              .reduce<number[]>((acc, i) => {
                if (acc.length > 0 && i - acc[acc.length - 1] > 1) acc.push(-1);
                acc.push(i);
                return acc;
              }, [])
              .map((i, idx) =>
                i === -1 ? (
                  <span key={`gap-${idx}`} className="px-1">
                    …
                  </span>
                ) : (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`rounded-lg px-2.5 py-1.5 font-semibold ${
                      i === currentPage ? 'bg-accent text-white' : 'border border-border text-textSecondary'
                    }`}
                  >
                    {i + 1}
                  </button>
                ),
              )}
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={currentPage === pageCount - 1}
              className="rounded-lg border border-border px-2.5 py-1.5 font-semibold text-textSecondary disabled:opacity-30"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
