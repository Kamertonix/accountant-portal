'use client';

import { useState } from 'react';
import { quarterLabel, taxYearQuarters, type PeriodOption } from '@/lib/period';

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
  const [showCustom, setShowCustom] = useState(value.kind === 'custom');
  const [customFrom, setCustomFrom] = useState(value.kind === 'custom' ? value.from : periodFromIso);
  const [customTo, setCustomTo] = useState(value.kind === 'custom' ? value.to : periodToIso);

  function handlePreset(raw: string) {
    if (raw === 'custom') {
      setShowCustom(true);
      onChange({ kind: 'custom', from: customFrom, to: customTo });
      return;
    }
    setShowCustom(false);
    if (raw === 'all') {
      onChange({ kind: 'all' });
    } else {
      onChange({ kind: 'quarter', index: Number(raw.slice(1)) as 1 | 2 | 3 | 4 });
    }
  }

  function handleCustomChange(from: string, to: string) {
    setCustomFrom(from);
    setCustomTo(to);
    onChange({ kind: 'custom', from, to });
  }

  const selectValue = showCustom ? 'custom' : value.kind === 'all' ? 'all' : value.kind === 'quarter' ? `q${value.index}` : 'all';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={selectValue}
        onChange={(e) => handlePreset(e.target.value)}
        className="rounded-lg border border-border bg-input px-3 py-2 text-sm font-semibold text-textPrimary outline-none focus:border-accentStroke"
      >
        <option value="all">
          Full tax year ({new Date(periodFromIso).toLocaleDateString('en-GB')} – {new Date(periodToIso).toLocaleDateString('en-GB')})
        </option>
        {quarters.map((q, i) => (
          <option key={`q${i + 1}`} value={`q${i + 1}`}>
            {quarterLabel(q, i + 1)}
          </option>
        ))}
        <option value="custom">Custom range…</option>
      </select>

      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            min={periodFromIso}
            max={customTo}
            onChange={(e) => handleCustomChange(e.target.value, customTo)}
            className="[color-scheme:dark] rounded-lg border border-border bg-input px-3 py-2 text-sm text-textPrimary outline-none focus:border-accentStroke"
          />
          <span className="text-textMuted">–</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            max={periodToIso}
            onChange={(e) => handleCustomChange(customFrom, e.target.value)}
            className="[color-scheme:dark] rounded-lg border border-border bg-input px-3 py-2 text-sm text-textPrimary outline-none focus:border-accentStroke"
          />
        </div>
      )}
    </div>
  );
}
