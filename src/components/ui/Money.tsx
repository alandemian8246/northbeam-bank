import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import type { Cents } from '@/lib/types';

/** Money-in is tinted green and signed; money-out stays in primary ink (the minus sign carries meaning). */
export function Amount({ cents, className, muted }: { cents: Cents; className?: string; muted?: boolean }) {
  return (
    <span className={cn('num whitespace-nowrap', muted ? 'text-ink-3 line-through' : cents > 0 ? 'text-good' : 'text-ink', className)}>
      {formatMoney(cents, { sign: true })}
    </span>
  );
}

/** Large balance with de-emphasised cents, the way most banking UIs render headline figures. */
export function BigMoney({ cents, className }: { cents: Cents; className?: string }) {
  const [whole, frac] = formatMoney(cents).split('.');
  return (
    <span className={cn('num font-semibold tracking-tight', className)}>
      {whole}
      <span className="text-ink-3">.{frac}</span>
    </span>
  );
}
