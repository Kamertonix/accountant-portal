export type PeriodOption =
  | { kind: 'all' }
  | { kind: 'quarter'; index: 1 | 2 | 3 | 4 }
  | { kind: 'month'; index: number }; // 0-11, chronological within the tax year (Apr=0 ... Mar=11)

export interface DateRange {
  from: Date;
  to: Date;
}

/// UK tax year runs 6 April → 5 April. Splits it into the standard four
/// quarters (matches the most common VAT quarter pattern) and twelve
/// months, both anchored to the actual synced period_from — never
/// assumes the current calendar year, since an accountant may well be
/// looking at a prior tax year's data.
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

export function taxYearMonths(periodFromIso: string): DateRange[] {
  const start = new Date(periodFromIso);
  const ranges: DateRange[] = [];
  for (let i = 0; i < 12; i++) {
    const from = new Date(start);
    from.setMonth(from.getMonth() + i);
    const to = new Date(from);
    to.setMonth(to.getMonth() + 1);
    to.setDate(to.getDate() - 1);
    ranges.push({ from, to });
  }
  return ranges;
}

export function monthLabel(range: DateRange): string {
  return range.from.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function quarterLabel(range: DateRange, index: number): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `Q${index} (${fmt(range.from)} – ${fmt(range.to)})`;
}

export function rangeForOption(option: PeriodOption, periodFromIso: string): DateRange | null {
  if (option.kind === 'all') return null;
  if (option.kind === 'quarter') return taxYearQuarters(periodFromIso)[option.index - 1];
  return taxYearMonths(periodFromIso)[option.index];
}

export function isWithinRange(dateText: unknown, range: DateRange | null): boolean {
  if (!range) return true;
  const date = new Date(String(dateText ?? ''));
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= range.from.getTime() && date.getTime() <= range.to.getTime();
}
