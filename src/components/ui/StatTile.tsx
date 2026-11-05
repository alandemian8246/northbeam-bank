import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Card } from './Card';

interface StatTileProps {
  label: string;
  value: ReactNode;
  /** Relative change vs. comparison period. */
  change?: number | null;
  /** Whether an increase is good (money in) or bad (money out). */
  positiveIsGood?: boolean;
  footnote?: ReactNode;
  icon?: ReactNode;
}

export function StatTile({ label, value, change, positiveIsGood = true, footnote, icon }: StatTileProps) {
  const good = change != null && (change >= 0) === positiveIsGood;
  const Arrow = change != null && change >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-ink-3">{label}</p>
        {icon}
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{value}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {change != null && (
          <span className={cn('num inline-flex items-center gap-0.5 font-medium', good ? 'text-good' : 'text-bad')}>
            <Arrow className="h-3.5 w-3.5" aria-hidden />
            {formatPercent(change)}
          </span>
        )}
        {footnote && <span className="text-ink-3">{footnote}</span>}
      </div>
    </Card>
  );
}
