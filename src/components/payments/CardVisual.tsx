import { Snowflake, Wifi } from 'lucide-react';
import type { Card } from '@/lib/types';
import { cn } from '@/lib/cn';

/** Stylised card face. Frozen cards are desaturated with a clear label. */
export function CardVisual({ card, className }: { card: Card; className?: string }) {
  return (
    <div
      className={cn(
        'relative aspect-[1.586] w-full overflow-hidden rounded-xl p-4 text-white shadow-pop transition',
        card.type === 'virtual'
          ? 'bg-[linear-gradient(135deg,#1f3fa8_0%,#2a5bd7_55%,#5b8af0_100%)]'
          : 'bg-[linear-gradient(135deg,#17171a_0%,#2e2e33_60%,#4a4a52_100%)]',
        card.frozen && 'grayscale',
        className,
      )}
    >
      <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" aria-hidden />
      <div className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/5" aria-hidden />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <span className="text-sm font-semibold tracking-tight">Ledgerline</span>
          <span className="text-[10px] uppercase tracking-wider text-white/70">{card.type}</span>
        </div>
        {card.frozen ? (
          <span className="inline-flex w-fit items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur">
            <Snowflake className="h-3 w-3" aria-hidden /> Frozen
          </span>
        ) : (
          <Wifi className="h-4 w-4 rotate-90 text-white/70" aria-hidden />
        )}
        <div>
          <p className="num font-mono text-sm tracking-widest">•••• •••• •••• {card.last4}</p>
          <div className="mt-1 flex items-end justify-between text-[11px] text-white/80">
            <span className="truncate">{card.holder}</span>
            <span className="num">{card.expires}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
