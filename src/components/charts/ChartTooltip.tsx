import type { ReactNode } from 'react';
import { formatMoney } from '@/lib/format';

export interface TooltipRow {
  label: string;
  value: number;
  color?: string;
  emphasis?: boolean;
}

/** Shared tooltip body: swatch carries identity, text stays in ink colors. */
export function TooltipCard({ title, rows, footer }: { title: string; rows: TooltipRow[]; footer?: ReactNode }) {
  return (
    <div className="min-w-[180px] rounded-lg border border-line bg-surface px-3 py-2.5 text-xs shadow-pop">
      <p className="mb-1.5 font-medium text-ink">{title}</p>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-2">
              {r.color && <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} aria-hidden />}
              {r.label}
            </span>
            <span className={r.emphasis ? 'num font-semibold text-ink' : 'num text-ink'}>{formatMoney(r.value)}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-2 border-t border-line pt-1.5 text-ink-3">{footer}</div>}
    </div>
  );
}

export function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export const axisProps = {
  stroke: 'var(--chart-axis)',
  tick: { fill: 'var(--chart-axis)', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

export const compactMoney = (cents: number) => formatMoney(cents, { compact: true });
