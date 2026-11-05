import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Download, Inbox, Search, SlidersHorizontal, X } from 'lucide-react';
import { useBank } from '@/store/bank';
import { useUi } from '@/store/ui';
import { useAccountLookup } from '@/hooks/useBank';
import {
  activeFilterCount, applyFilters, DEFAULT_FILTERS, filtersFromParams, filtersToParams, toCsv,
  type DateRange, type SortKey, type TxnFilters,
} from '@/lib/filters';
import { CATEGORIES, type TxnStatus } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState } from '@/components/ui/EmptyState';
import { TransactionTable } from '@/components/transactions/TransactionTable';

const PAGE_SIZE = 25;
const RANGE_LABEL: Record<DateRange, string> = { all: 'All time', '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', ytd: 'Year to date', custom: 'Custom range' };
const STATUS_LABEL: Record<TxnStatus, string> = { posted: 'Posted', pending: 'Pending', failed: 'Failed' };

function Chip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface py-0.5 pl-2.5 pr-1 text-xs">
      {children}
      <button onClick={onRemove} className="rounded-full p-0.5 text-ink-3 hover:bg-subtle hover:text-ink" aria-label="Remove filter">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export default function Transactions() {
  const transactions = useBank((s) => s.transactions);
  const accounts = useBank((s) => s.accounts);
  const cards = useBank((s) => s.cards);
  const toast = useUi((s) => s.toast);
  const account = useAccountLookup();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const [query, setQuery] = useState(filters.query);
  const [panelOpen, setPanelOpen] = useState(false);
  const [page, setPage] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<TxnFilters>) => {
    setParams(filtersToParams({ ...filters, ...patch }), { replace: true });
    setPage(0);
  };

  // Debounce search so typing doesn't thrash history or re-filter on every keystroke.
  useEffect(() => {
    if (query === filters.query) return;
    const id = setTimeout(() => update({ query }), 200);
    return () => clearTimeout(id);
  }, [query, filters]); // `update` only closes over `filters`, which is listed.

  // Keep the input in sync when the URL changes elsewhere (e.g. "Clear all").
  useEffect(() => setQuery(filters.query), [filters.query]);

  // "/" focuses search, the way most data-heavy apps behave.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => applyFilters(transactions, filters), [transactions, filters]);
  const summary = useMemo(() => {
    let moneyIn = 0;
    let moneyOut = 0;
    for (const t of results) {
      if (t.status === 'failed') continue;
      if (t.amount > 0) moneyIn += t.amount;
      else moneyOut += t.amount;
    }
    return { moneyIn, moneyOut };
  }, [results]);

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = results.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const advanced = activeFilterCount(filters);

  const onSort = (key: SortKey) => update({ sort: key, desc: filters.sort === key ? !filters.desc : true });

  const exportCsv = () => {
    const csv = toCsv(results, (id) => account(id)?.name ?? id);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledgerline-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export ready', description: `${results.length} transactions downloaded as CSV.` });
  };

  const chips: Array<{ key: string; label: string; remove: () => void }> = [];
  if (filters.accountId !== 'all') chips.push({ key: 'acct', label: `Account: ${account(filters.accountId)?.name ?? '—'}`, remove: () => update({ accountId: 'all' }) });
  if (filters.cardId) chips.push({ key: 'card', label: `Card: ${cards.find((c) => c.id === filters.cardId)?.nickname ?? '—'}`, remove: () => update({ cardId: undefined }) });
  if (filters.range !== 'all') {
    const label = filters.range === 'custom' ? `${filters.from ?? '…'} → ${filters.to ?? '…'}` : RANGE_LABEL[filters.range];
    chips.push({ key: 'range', label, remove: () => update({ range: 'all', from: undefined, to: undefined }) });
  }
  for (const c of filters.categories) chips.push({ key: `c-${c}`, label: c, remove: () => update({ categories: filters.categories.filter((x) => x !== c) }) });
  for (const s of filters.statuses) chips.push({ key: `s-${s}`, label: STATUS_LABEL[s], remove: () => update({ statuses: filters.statuses.filter((x) => x !== s) }) });
  if (filters.minAmount != null || filters.maxAmount != null) {
    chips.push({
      key: 'amt',
      label: `Amount ${filters.minAmount != null ? `≥ $${filters.minAmount}` : ''}${filters.minAmount != null && filters.maxAmount != null ? ' and ' : ''}${filters.maxAmount != null ? `≤ $${filters.maxAmount}` : ''}`,
      remove: () => update({ minAmount: undefined, maxAmount: undefined }),
    });
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every payment, deposit and card charge across your accounts."
        actions={<Button onClick={exportCsv} disabled={!results.length}><Download className="h-4 w-4" aria-hidden />Export CSV</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, amount, reference…"
              aria-label="Search transactions"
              className="field pl-9 pr-8"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1 font-mono text-[10px] text-ink-3 sm:block">/</kbd>
          </div>
          <select aria-label="Account" className="field w-auto" value={filters.accountId} onChange={(e) => update({ accountId: e.target.value })}>
            <option value="all">All accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select aria-label="Date range" className="field w-auto" value={filters.range} onChange={(e) => update({ range: e.target.value as DateRange })}>
            {Object.entries(RANGE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <Segmented
            label="Direction"
            value={filters.direction}
            onChange={(direction) => update({ direction })}
            options={[{ value: 'all', label: 'All' }, { value: 'in', label: 'Money in' }, { value: 'out', label: 'Money out' }]}
          />
          <Button onClick={() => setPanelOpen(!panelOpen)} aria-expanded={panelOpen} aria-controls="filter-panel" className={cn(panelOpen && 'bg-subtle')}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters
            {advanced > 0 && <span className="rounded-full bg-brand px-1.5 text-[10px] font-semibold text-brand-ink">{advanced}</span>}
          </Button>
        </div>

        {filters.range === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 border-b border-line px-3 py-3">
            <div>
              <label htmlFor="from" className="label">From</label>
              <input id="from" type="date" className="field" value={filters.from ?? ''} max={filters.to} onChange={(e) => update({ from: e.target.value || undefined })} />
            </div>
            <div>
              <label htmlFor="to" className="label">To</label>
              <input id="to" type="date" className="field" value={filters.to ?? ''} min={filters.from} onChange={(e) => update({ to: e.target.value || undefined })} />
            </div>
          </div>
        )}

        {panelOpen && (
          <div id="filter-panel" className="grid grid-cols-1 gap-5 border-b border-line bg-subtle/50 p-4 md:grid-cols-[2fr_1fr_1fr]">
            <fieldset>
              <legend className="label">Category</legend>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => {
                  const on = filters.categories.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => update({ categories: toggle(filters.categories, c) })}
                      aria-pressed={on}
                      className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors', on ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-ink-2 hover:border-ink-3/50')}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="label">Status</legend>
              <div className="space-y-1.5">
                {(Object.keys(STATUS_LABEL) as TxnStatus[]).map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 rounded accent-[rgb(var(--brand))]" checked={filters.statuses.includes(s)} onChange={() => update({ statuses: toggle(filters.statuses, s) })} />
                    {STATUS_LABEL[s]}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="label">Amount (USD)</legend>
              <div className="flex items-center gap-2">
                <input aria-label="Minimum amount" type="number" min={0} className="field" placeholder="Min" value={filters.minAmount ?? ''} onChange={(e) => update({ minAmount: e.target.value === '' ? undefined : Number(e.target.value) })} />
                <span className="text-ink-3">–</span>
                <input aria-label="Maximum amount" type="number" min={0} className="field" placeholder="Max" value={filters.maxAmount ?? ''} onChange={(e) => update({ maxAmount: e.target.value === '' ? undefined : Number(e.target.value) })} />
              </div>
            </fieldset>
          </div>
        )}

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-3 py-2.5">
            {chips.map((c) => <Chip key={c.key} onRemove={c.remove}>{c.label}</Chip>)}
            <button className="ml-1 text-xs font-medium text-brand hover:underline" onClick={() => { setParams(filtersToParams({ ...DEFAULT_FILTERS, query: filters.query }), { replace: true }); setPage(0); }}>
              Clear all
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3 text-xs text-ink-3" aria-live="polite">
          <span><span className="num font-medium text-ink">{results.length.toLocaleString()}</span> transactions</span>
          <span>In <span className="num font-medium text-good">{formatMoney(summary.moneyIn)}</span></span>
          <span>Out <span className="num font-medium text-ink">{formatMoney(summary.moneyOut)}</span></span>
          <span>Net <span className="num font-medium text-ink">{formatMoney(summary.moneyIn + summary.moneyOut, { sign: true })}</span></span>
        </div>

        {visible.length ? (
          <div className="border-t border-line">
            <TransactionTable transactions={visible} sort={{ key: filters.sort, desc: filters.desc, onChange: onSort }} />
          </div>
        ) : (
          <div className="border-t border-line">
            <EmptyState
              icon={Inbox}
              title="No transactions match"
              description="Try a different search term or remove a filter."
              action={<Button onClick={() => { setQuery(''); setParams(new URLSearchParams(), { replace: true }); }}>Reset filters</Button>}
            />
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-ink-3">
            <span className="num">
              {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, results.length)} of {results.length}
            </span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" disabled={current === 0} onClick={() => { setPage(current - 1); window.scrollTo({ top: 0 }); }} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="num px-2">Page {current + 1} of {pages}</span>
              <Button size="sm" variant="ghost" disabled={current >= pages - 1} onClick={() => { setPage(current + 1); window.scrollTo({ top: 0 }); }} aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
