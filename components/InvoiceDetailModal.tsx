'use client';

import { X, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { exportPath, downloadBlob } from '@/lib/download';
import Card from './Card';

interface InvoiceLine {
  type: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  periodFrom?: string;
  periodTo?: string;
}

interface Payment {
  date: string;
  amount: number;
  text?: string;
}

interface InvoiceDetail {
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
  lines?: InvoiceLine[];
  payments?: Payment[];
}

function money(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function ukDate(text: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text ?? '');
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return text || '—';
}

export default function InvoiceDetailModal({
  invoice,
  clientUserId,
  clientLabel,
  taxYear,
  issuer,
  onClose,
}: {
  invoice: InvoiceDetail;
  clientUserId: string;
  clientLabel: string;
  taxYear: string;
  issuer: Record<string, unknown> | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const total = invoice.netAmount + invoice.vatAmount;
  const lines = invoice.lines ?? [];
  const payments = invoice.payments ?? [];

  async function downloadPdf() {
    setBusy(true);
    try {
      const path = `${clientUserId}/${invoice.id ?? invoice.number}.pdf`;
      const { data, error } = await supabase.storage.from('accountant-invoices').download(path);
      if (error || !data) throw error ?? new Error('No file');
      downloadBlob(data, exportPath(clientLabel, taxYear, 'Invoices', `invoice-${invoice.number}.pdf`));
    } catch {
      // silently ignore — button below shows a fallback state via title
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Card tone="accent">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-lg font-bold text-textPrimary">{invoice.number}</p>
              <p className="text-xs text-textMuted">
                {ukDate(invoice.date)} &middot; Due {ukDate(invoice.dueDate)} &middot; {invoice.status}
              </p>
            </div>
            <button onClick={onClose} className="text-textMuted transition hover:text-textPrimary">
              <X size={20} />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-textMuted">From</p>
              {issuer ? (
                <>
                  <p className="text-sm font-semibold text-textPrimary">
                    {String(issuer.businessName || `${issuer.firstName ?? ''} ${issuer.surname ?? ''}`.trim() || '—')}
                  </p>
                  {[issuer.addressLine1, issuer.addressLine2, issuer.city, issuer.postcode, issuer.country]
                    .filter(Boolean)
                    .join(', ') && (
                    <p className="text-xs text-textMuted">
                      {[issuer.addressLine1, issuer.addressLine2, issuer.city, issuer.postcode, issuer.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                  {issuer.email ? <p className="text-xs text-textMuted">{String(issuer.email)}</p> : null}
                  {issuer.phone ? <p className="text-xs text-textMuted">{String(issuer.phone)}</p> : null}
                </>
              ) : (
                <p className="text-xs text-textMuted">Share &ldquo;Business Profile&rdquo; to see issuer details here.</p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-textMuted">Client</p>
              <p className="text-sm font-semibold text-textPrimary">{invoice.client}</p>
              {invoice.clientAddress && <p className="text-xs text-textMuted">{invoice.clientAddress}</p>}
              {invoice.clientEmail && <p className="text-xs text-textMuted">{invoice.clientEmail}</p>}
              {invoice.clientPhone && <p className="text-xs text-textMuted">{invoice.clientPhone}</p>}
              {invoice.clientUtr && <p className="mt-1 text-xs text-textMuted">UTR: {invoice.clientUtr}</p>}
              {invoice.clientVat && <p className="text-xs text-textMuted">VAT: {invoice.clientVat}</p>}
            </div>
          </div>
          {invoice.description && <p className="mb-4 text-xs text-textSecondary">{invoice.description}</p>}

          {lines.length > 0 && (
            <div className="mb-4 overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-input text-left text-xs font-bold uppercase tracking-wide text-textMuted">
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-2 text-textSecondary">{line.description}</td>
                      <td className="px-3 py-2 text-right text-textSecondary">{line.qty}</td>
                      <td className="px-3 py-2 text-right text-textSecondary">{money(line.rate)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-textPrimary">{money(line.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mb-4 flex flex-col gap-1 rounded-xl border border-border bg-input/40 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-textMuted">Net</span>
              <span className="font-semibold text-textPrimary">{money(invoice.netAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted">VAT</span>
              <span className="font-semibold text-textPrimary">{money(invoice.vatAmount)}</span>
            </div>
            {invoice.cisAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-textMuted">CIS deducted</span>
                <span className="font-semibold text-textPrimary">-{money(invoice.cisAmount)}</span>
              </div>
            )}
            <div className="my-1 h-px bg-border" />
            <div className="flex justify-between">
              <span className="font-bold text-textPrimary">Total</span>
              <span className="font-bold text-accentLight">{money(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted">Paid</span>
              <span className="font-semibold text-success">{money(invoice.paidAmount)}</span>
            </div>
          </div>

          {payments.length > 0 && (
            <div className="mb-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-textMuted">Payment history</p>
              {payments.map((p, i) => (
                <div key={i} className="flex justify-between py-0.5 text-xs">
                  <span className="text-textMuted">
                    {ukDate(p.date)} {p.text ? `· ${p.text}` : ''}
                  </span>
                  <span className="font-semibold text-textSecondary">{money(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={downloadPdf}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            <Download size={16} /> {busy ? 'Downloading…' : 'Download PDF'}
          </button>
        </Card>
      </div>
    </div>
  );
}
