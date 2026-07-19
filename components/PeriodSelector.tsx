'use client';

import { monthLabel, quarterLabel, taxYearMonths, taxYearQuarters, type PeriodOption } from '@/lib/period';

export default function PeriodSelector({
  periodFromIso,
  periodToIso,
  value,
  onChange,
}: {
  periodFromIso: string;
  periodToIso: string;
  value: PeriodOption;
  onChange: (option: PeriodOption) => void;
}) {
  const quarters = taxYearQuarters(periodFromIso);
  const months = taxYearMonths(periodFromIso);

  function encode(option: PeriodOption): string {
    if (option.kind === 'all') return 'all';
    if (option.kind === 'quarter') return `q${option.index}`;
    return `m${option.index}`;
  }

  function decode(raw: string): PeriodOption {
    if (raw === 'all') return { kind: 'all' };
    if (raw.startsWith('q')) return { kind: 'quarter', index: Number(raw.slice(1)) as 1 | 2 | 3 | 4 };
    return { kind: 'month', index: Number(raw.slice(1)) };
  }

  return (
    <select
      value={encode(value)}
      onChange={(e) => onChange(decode(e.target.value))}
      className="rounded-lg border border-border bg-input px-3 py-2 text-sm font-semibold text-textPrimary outline-none focus:border-accentStroke"
    >
      <option value="all">
        Full tax year ({new Date(periodFromIso).toLocaleDateString('en-GB')} – {new Date(periodToIso).toLocaleDateString('en-GB')})
      </option>
      <optgroup label="Quarters">
        {quarters.map((q, i) => (
          <option key={`q${i + 1}`} value={`q${i + 1}`}>
            {quarterLabel(q, i + 1)}
          </option>
        ))}
      </optgroup>
      <optgroup label="Months">
        {months.map((m, i) => (
          <option key={`m${i}`} value={`m${i}`}>
            {monthLabel(m)}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
