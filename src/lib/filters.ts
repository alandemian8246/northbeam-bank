import { startOfDay, subDays } from 'date-fns';
import { CATEGORIES, type Category, type Transaction, type TxnStatus } from './types';

export type DateRange = 'all' | '7d' | '30d' | '90d' | 'ytd' | 'custom';
export type Direction = 'all' | 'in' | 'out';
export type SortKey = 'date' | 'amount' | 'counterparty';

export interface TxnFilters {
  query: string;
  accountId: string | 'all';
  categories: Category[];
  statuses: TxnStatus[];
  direction: Direction;
  range: DateRange;
  from?: string;
  to?: string;
  minAmount?: number;
  maxAmount?: number;
  cardId?: string;
  sort: SortKey;
  desc: boolean;
}

export const DEFAULT_FILTERS: TxnFilters = {
  query: '',
  accountId: 'all',
  categories: [],
  statuses: [],
  direction: 'all',
  range: 'all',
  sort: 'date',
  desc: true,
};

export function rangeStart(range: DateRange, now = new Date()): Date | null {
  switch (range) {
    case '7d': return startOfDay(subDays(now, 6));
    case '30d': return startOfDay(subDays(now, 29));
    case '90d': return startOfDay(subDays(now, 89));
    case 'ytd': return new Date(now.getFullYear(), 0, 1);
    default: return null;
  }
}

/** Search matches description, counterparty, reference, note, category and the formatted amount. */
function matchesQuery(t: Transaction, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase().trim();
  const amount = (Math.abs(t.amount) / 100).toFixed(2);
  return [t.description, t.counterparty, t.reference, t.note ?? '', t.category, amount]
    .some((field) => field.toLowerCase().includes(needle));
}

export function applyFilters(txns: Transaction[], f: TxnFilters, now = new Date()): Transaction[] {
  const start = f.range === 'custom' ? (f.from ? startOfDay(new Date(f.from)) : null) : rangeStart(f.range, now);
  const end = f.range === 'custom' && f.to ? new Date(`${f.to}T23:59:59.999`) : null;
  const min = f.minAmount != null ? f.minAmount * 100 : null;
  const max = f.maxAmount != null ? f.maxAmount * 100 : null;

  const result = txns.filter((t) => {
    if (f.accountId !== 'all' && t.accountId !== f.accountId) return false;
    if (f.cardId && t.cardId !== f.cardId) return false;
    if (f.categories.length && !f.categories.includes(t.category)) return false;
    if (f.statuses.length && !f.statuses.includes(t.status)) return false;
    if (f.direction === 'in' && t.amount <= 0) return false;
    if (f.direction === 'out' && t.amount >= 0) return false;
    const date = new Date(t.date);
    if (start && date < start) return false;
    if (end && date > end) return false;
    const abs = Math.abs(t.amount);
    if (min != null && abs < min) return false;
    if (max != null && abs > max) return false;
    return matchesQuery(t, f.query);
  });

  const dir = f.desc ? -1 : 1;
  return result.sort((a, b) => {
    switch (f.sort) {
      case 'amount': return (a.amount - b.amount) * dir;
      case 'counterparty': return a.counterparty.localeCompare(b.counterparty) * dir;
      default: return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
    }
  });
}

export function activeFilterCount(f: TxnFilters): number {
  return [
    f.accountId !== 'all',
    f.categories.length > 0,
    f.statuses.length > 0,
    f.direction !== 'all',
    f.range !== 'all',
    f.minAmount != null || f.maxAmount != null,
    !!f.cardId,
  ].filter(Boolean).length;
}

export function toCsv(txns: Transaction[], accountName: (id: string) => string): string {
  const header = ['Date', 'Description', 'Counterparty', 'Account', 'Category', 'Status', 'Method', 'Amount', 'Reference', 'Note'];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = txns.map((t) => [
    t.date.slice(0, 10), t.description, t.counterparty, accountName(t.accountId), t.category,
    t.status, t.method.toUpperCase(), (t.amount / 100).toFixed(2), t.reference, t.note ?? '',
  ].map(esc).join(','));
  return [header.join(','), ...rows].join('\n');
}

const RANGES: DateRange[] = ['all', '7d', '30d', '90d', 'ytd', 'custom'];
const STATUSES: TxnStatus[] = ['posted', 'pending', 'failed'];

/** Filters <-> URL search params, so filtered views are linkable and survive reloads. */
export function filtersFromParams(p: URLSearchParams): TxnFilters {
  const list = (key: string) => p.get(key)?.split(',').filter(Boolean) ?? [];
  const num = (key: string) => {
    const v = p.get(key);
    return v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : undefined;
  };
  const range = p.get('range') as DateRange;
  const dir = p.get('dir');
  const sort = p.get('sort') as SortKey;
  return {
    ...DEFAULT_FILTERS,
    query: p.get('q') ?? '',
    accountId: p.get('account') ?? 'all',
    cardId: p.get('card') ?? undefined,
    categories: list('category').filter((c): c is Category => (CATEGORIES as readonly string[]).includes(c)),
    statuses: list('status').filter((s): s is TxnStatus => STATUSES.includes(s as TxnStatus)),
    direction: dir === 'in' || dir === 'out' ? dir : 'all',
    range: RANGES.includes(range) ? range : 'all',
    from: p.get('from') ?? undefined,
    to: p.get('to') ?? undefined,
    minAmount: num('min'),
    maxAmount: num('max'),
    sort: ['date', 'amount', 'counterparty'].includes(sort) ? sort : 'date',
    desc: p.get('asc') !== '1',
  };
}

export function filtersToParams(f: TxnFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.query) p.set('q', f.query);
  if (f.accountId !== 'all') p.set('account', f.accountId);
  if (f.cardId) p.set('card', f.cardId);
  if (f.categories.length) p.set('category', f.categories.join(','));
  if (f.statuses.length) p.set('status', f.statuses.join(','));
  if (f.direction !== 'all') p.set('dir', f.direction);
  if (f.range !== 'all') p.set('range', f.range);
  if (f.range === 'custom' && f.from) p.set('from', f.from);
  if (f.range === 'custom' && f.to) p.set('to', f.to);
  if (f.minAmount != null) p.set('min', String(f.minAmount));
  if (f.maxAmount != null) p.set('max', String(f.maxAmount));
  if (f.sort !== 'date') p.set('sort', f.sort);
  if (!f.desc) p.set('asc', '1');
  return p;
}
