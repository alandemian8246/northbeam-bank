import { format, isToday, isYesterday } from 'date-fns';
import { ArrowDown, ArrowUp, Paperclip, StickyNote } from 'lucide-react';
import type { SortKey } from '@/lib/filters';
import type { Transaction } from '@/lib/types';
import { useAccountLookup } from '@/hooks/useBank';
import { useUi } from '@/store/ui';
import { Amount } from '@/components/ui/Money';
import { StatusBadge } from '@/components/ui/Badge';
import { MerchantAvatar } from '@/components/ui/Merchant';
import { cn } from '@/lib/cn';

export function friendlyDate(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, d.getFullYear() === new Date().getFullYear() ? 'MMM d' : 'MMM d, yyyy');
}

const METHOD_SHORT: Record<Transaction['method'], string> = {
  ach: 'ACH', wire: 'Wire', card: 'Card', transfer: 'Transfer', check: 'Check', interest: 'Interest',
};

/** Secondary line: the description, unless it just repeats the counterparty name. */
function subtitle(t: Transaction) {
  return t.description.toLowerCase().startsWith(t.counterparty.toLowerCase()) ? `${METHOD_SHORT[t.method]} · ${t.category}` : t.description;
}

interface Props {
  transactions: Transaction[];
  compact?: boolean;
  sort?: { key: SortKey; desc: boolean; onChange: (key: SortKey) => void };
}

function SortHeader({ label, k, sort, className }: { label: string; k: SortKey; sort?: Props['sort']; className?: string }) {
  if (!sort) return <th scope="col" className={className}>{label}</th>;
  const active = sort.key === k;
  const Icon = sort.desc ? ArrowDown : ArrowUp;
  return (
    <th scope="col" className={className} aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
      <button onClick={() => sort.onChange(k)} className={cn('inline-flex items-center gap-1 hover:text-ink', active && 'text-ink')}>
        {label}
        {active && <Icon className="h-3 w-3" aria-hidden />}
      </button>
    </th>
  );
}

export function TransactionTable({ transactions, compact, sort }: Props) {
  const account = useAccountLookup();
  const openTxn = useUi((s) => s.openTxn);

  return (
    <>
      {/* Desktop: table */}
      <table className="hidden w-full text-left text-sm md:table">
        <thead>
          <tr className="border-b border-line text-xs font-medium text-ink-3 [&>th]:px-3 [&>th]:py-2.5 [&>th:first-child]:pl-5 [&>th:last-child]:pr-5">
            <SortHeader label="Date" k="date" sort={sort} className="w-24" />
            <SortHeader label="To / From" k="counterparty" sort={sort} />
            {!compact && <th scope="col">Account</th>}
            {!compact && <th scope="col">Category</th>}
            <th scope="col">Status</th>
            <SortHeader label="Amount" k="amount" sort={sort} className="text-right" />
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr
              key={t.id}
              onClick={() => openTxn(t.id)}
              onKeyDown={(e) => e.key === 'Enter' && openTxn(t.id)}
              tabIndex={0}
              className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-subtle/70 focus-visible:bg-subtle [&>td]:px-3 [&>td]:py-2.5 [&>td:first-child]:pl-5 [&>td:last-child]:pr-5"
            >
              <td className="whitespace-nowrap text-ink-2">{friendlyDate(t.date)}</td>
              <td className={cn('max-w-0', compact ? 'w-[55%]' : 'w-[38%]')}>
                <div className="flex items-center gap-3">
                  <MerchantAvatar category={t.category} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{t.counterparty}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-ink-3">
                      <span className="truncate">{subtitle(t)}</span>
                      {t.note && <StickyNote className="h-3 w-3 shrink-0" aria-label="Has note" />}
                      {t.hasReceipt && <Paperclip className="h-3 w-3 shrink-0" aria-label="Receipt attached" />}
                    </p>
                  </div>
                </div>
              </td>
              {!compact && <td className="whitespace-nowrap text-ink-2">{account(t.accountId)?.name}</td>}
              {!compact && <td className="whitespace-nowrap text-ink-2">{t.category}</td>}
              <td><StatusBadge status={t.status} /></td>
              <td className="text-right font-medium"><Amount cents={t.amount} muted={t.status === 'failed'} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: stacked list */}
      <ul className="divide-y divide-line/70 md:hidden">
        {transactions.map((t) => (
          <li key={t.id}>
            <button onClick={() => openTxn(t.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-subtle/70">
              <MerchantAvatar category={t.category} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.counterparty}</p>
                <p className="truncate text-xs text-ink-3">
                  {friendlyDate(t.date)} · {account(t.accountId)?.name}
                  {t.status !== 'posted' && ` · ${t.status === 'pending' ? 'Pending' : 'Failed'}`}
                </p>
              </div>
              <Amount cents={t.amount} muted={t.status === 'failed'} className="text-sm font-medium" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
