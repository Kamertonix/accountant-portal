'use client';

import { useState } from 'react';
import { Download, FileDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportPath, downloadBlob } from '@/lib/download';
import Card from './Card';

interface TransactionExportEntry {
  period: string;
  csv: string;
}

// Same sanitisation as the app's own sync code
// (accountant_access_service.dart's sanitisePeriod) — must match
// exactly, since this builds the Storage path the PDF was uploaded to.
function sanitisePeriod(period: string): string {
  return period
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/// The app's own bounded 5-period Transactions export (Full Tax Year +
/// Q1-Q4) — same renderer as its "Create Export" button
/// (TransactionExportService.buildExportBytes). Both the CSV text and
/// the PDF are the exact bytes the app produced, synced via
/// accountant-sync-snapshot (CSV, embedded in the payload) and
/// accountant-sync-transaction-pdfs (PDF, uploaded to
/// accountant-transaction-exports). Nothing here is generated in the
/// browser — this is a real download, not a reimplementation.
export default function TransactionExports({
  exports: entries,
  clientUserId,
  clientLabel,
  taxYear,
}: {
  exports: TransactionExportEntry[];
  clientUserId: string;
  clientLabel: string;
  taxYear: string;
}) {
  const [period, setPeriod] = useState(entries[0]?.period ?? '');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);

  if (entries.length === 0) return null;

  const active = entries.find((e) => e.period === period) ?? entries[0];

  function handleDownloadCsv() {
    const blob = new Blob([active.csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, exportPath(clientLabel, taxYear, 'Transactions', `${sanitisePeriod(active.period)}.csv`));
  }

  async function handleDownloadPdf() {
    setPdfBusy(true);
    setPdfFailed(false);
    try {
      const path = `${clientUserId}/${sanitisePeriod(active.period)}.pdf`;
      const { data, error } = await supabase.storage.from('accountant-transaction-exports').download(path);
      if (error || !data) throw error ?? new Error('No file');
      downloadBlob(data, exportPath(clientLabel, taxYear, 'Transactions', `${sanitisePeriod(active.period)}.pdf`));
    } catch {
      setPdfFailed(true);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-textPrimary">Official export</p>
          <p className="text-xs text-textMuted">Same CSV/PDF as the app&rsquo;s own &ldquo;Create Export&rdquo; button — with Income/Expenses totals.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={active.period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-textPrimary outline-none focus:border-accentStroke"
          >
            {entries.map((e) => (
              <option key={e.period} value={e.period}>
                {e.period}
              </option>
            ))}
          </select>
          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-textSecondary transition hover:border-accentStroke hover:text-textPrimary"
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfBusy}
            title={pdfFailed ? 'Not available yet — ask your client to sync' : 'Download PDF'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-textSecondary transition hover:border-accentStroke hover:text-textPrimary disabled:opacity-50"
          >
            <FileDown size={14} /> {pdfFailed ? 'Unavailable' : pdfBusy ? '…' : 'PDF'}
          </button>
        </div>
      </div>
    </Card>
  );
}
