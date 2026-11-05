import type { ReactNode } from 'react';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { TxnStatus } from '@/lib/types';

type Tone = 'neutral' | 'brand' | 'good' | 'warn' | 'bad';

const tones: Record<Tone, string> = {
  neutral: 'bg-subtle text-ink-2',
  brand: 'bg-brand-soft text-brand',
  good: 'bg-good-soft text-good',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium', tones[tone], className)}>
      {children}
    </span>
  );
}

/** Status always pairs an icon and a label with its color. */
export function StatusBadge({ status }: { status: TxnStatus }) {
  if (status === 'pending') return <Badge tone="warn"><Clock3 className="h-3 w-3" aria-hidden />Pending</Badge>;
  if (status === 'failed') return <Badge tone="bad"><XCircle className="h-3 w-3" aria-hidden />Failed</Badge>;
  return <Badge tone="good"><CheckCircle2 className="h-3 w-3" aria-hidden />Posted</Badge>;
}
