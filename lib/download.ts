// Chrome/Edge (Chromium) let the `download` attribute create subfolders
// under the browser's Downloads folder when the value contains forward
// slashes — not a web standard, and Firefox/Safari don't honour it (they
// flatten or reject it), but it's real, reliable behaviour on the
// browsers this portal is actually used on. No website can create
// folders anywhere else on a user's computer; this is the one place
// browsers allow it, and only inside the Downloads folder.

function sanitizeSegment(text: string): string {
  return text
    .trim()
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/// Builds "Tax Sole Trader/{client}/{tax year}/{section}/{filename}",
/// mirroring the app's own TaxSoleTrader/Export {year}/{Section}
/// convention (app_export_share_service.dart) — with the client name
/// added, since the portal serves many clients, unlike the app itself.
export function exportPath(clientLabel: string, taxYear: string, section: string, filename: string): string {
  const folders = ['Tax Sole Trader', clientLabel || 'Client', taxYear || 'Tax Year', section].map(sanitizeSegment);
  return [...folders, filename].join('/');
}

/// UK tax year label ("2026-2027") from an ISO period_from date
/// ("2026-04-06") — matches the format the app itself uses for its own
/// export folder names.
export function taxYearLabel(periodFromIso: string | null | undefined): string {
  if (!periodFromIso) return 'Tax Year';
  const year = new Date(periodFromIso).getFullYear();
  if (Number.isNaN(year)) return 'Tax Year';
  return `${year}-${year + 1}`;
}

export function downloadBlob(blob: Blob, path: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = path;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
