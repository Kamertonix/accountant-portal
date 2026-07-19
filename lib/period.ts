export type PeriodOption =
  | { kind: 'all' }
  | { kind: 'quarter'; index: 1 | 2 | 3 | 4 }
  | { kind: 'custom'; from: string; to: string }; // ISO 'YYYY-MM-DD'

export interface DateRange {
  from: Date;
  to: Date;
}

/// UK tax year runs 6 April → 5 April. Splits it into the standard four
/// quarters (matches the most common VAT quarter pattern), anchored to
/// the actual synced period_from — never assumes the current calendar
/// year, since an accountant may well be looking at a prior tax year's
/// data.
export function taxYearQuarters(periodFromIso: string): DateRange[] {
  const start = new Date(periodFromIso);
  const ranges: DateRange[] = [];
  for (let i = 0; i < 4; i++) {
    const from = new Date(start);
    from.setMonth(from.getMonth() + i * 3);
    const to = new Date(from);
    to.setMonth(to.getMonth() + 3);
    to.setDate(to.getDate() - 1);
    ranges.push({ from, to });
  }
  return ranges;
}

export function quarterLabel(range: DateRange, index: number): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `Q${index} (${fmt(range.from)} – ${fmt(range.to)})`;
}

export function rangeForOption(option: PeriodOption, periodFromIso: string): DateRange | null {
  if (option.kind === 'all') return null;
  if (option.kind === 'quarter') return taxYearQuarters(periodFromIso)[option.index - 1];
  const from = new Date(option.from);
  const to = new Date(option.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return { from, to };
}

/// Which of the four tax-year quarters "today" currently falls in —
/// used by the MTD Report shortcut, which shows the current filing
/// period's transactions, not a fixed one.
/// UK tax year start (6 April) for whichever tax year "today" falls
/// in — computed directly, not read from a snapshot, so shortcuts
/// that need "the current tax year" work even before anything's been
/// selected yet.
export function currentTaxYearStartIso(): string {
  const now = new Date();
  const year = now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6) ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-04-06`;
}

export function currentQuarterOption(periodFromIso: string): PeriodOption {
  const quarters = taxYearQuarters(periodFromIso);
  const now = new Date();
  for (let i = 0; i < quarters.length; i++) {
    if (now.getTime() >= quarters[i].from.getTime() && now.getTime() <= quarters[i].to.getTime()) {
      return { kind: 'quarter', index: (i + 1) as 1 | 2 | 3 | 4 };
    }
  }
  return { kind: 'all' };
}

function parseFlexibleDate(text: string): Date | null {
  const trimmed = text.trim();
  const iso = new Date(trimmed);
  if (!Number.isNaN(iso.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) return iso;
  const ukMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (ukMatch) {
    const day = Number(ukMatch[1]);
    const month = Number(ukMatch[2]);
    const year = Number(ukMatch[3]);
    const date = new Date(year, month - 1, day);
    if (!Number.isNaN(date.getTime())) return date;
  }
  // Last resort — let the platform try, covers any other
  // Date-constructor-parseable format not caught above.
  return Number.isNaN(iso.getTime()) ? null : iso;
}

export function isWithinRange(dateText: unknown, range: DateRange | null): boolean {
  if (!range) return true;
  const date = parseFlexibleDate(String(dateText ?? ''));
  if (!date) return false;
  return date.getTime() >= range.from.getTime() && date.getTime() <= range.to.getTime();
}
