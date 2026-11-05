import { Link } from 'react-router-dom';
import type { CategorySpend } from '@/lib/analytics';
import { formatMoney } from '@/lib/format';
import { MerchantAvatar } from '@/components/ui/Merchant';

/**
 * Ranked horizontal meters: one hue (magnitude, not identity), value and share in ink.
 * Each row links to the matching transactions.
 */
export function CategoryBreakdown({ data, limit = 6, range }: { data: CategorySpend[]; limit?: number; range?: string }) {
  const rows = data.slice(0, limit);
  const max = rows[0]?.amount ?? 1;
  return (
    <ul className="space-y-1">
      {rows.map((c) => (
        <li key={c.category}>
          <Link
            to={`/transactions?category=${encodeURIComponent(c.category)}${range ? `&range=${range}` : ''}`}
            className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-subtle"
            title={`${c.category}: ${formatMoney(c.amount)} across ${c.count} transactions`}
          >
            <MerchantAvatar category={c.category} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm text-ink">{c.category}</span>
                <span className="num text-sm font-medium">{formatMoney(c.amount, { compact: c.amount >= 1_000_000_00 })}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-subtle group-hover:bg-line/70">
                  <div className="h-full rounded-full" style={{ width: `${(c.amount / max) * 100}%`, background: 'var(--series-1)' }} />
                </div>
                <span className="num w-10 text-right text-[11px] text-ink-3">{(c.share * 100).toFixed(0)}%</span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
