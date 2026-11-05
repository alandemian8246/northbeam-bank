import { describe, expect, it } from 'vitest';
import { generateDemoData } from '@/data/generate';
import { accountBalance, balanceHistory, cashFlow, monthlyCashFlow, spendingByCategory } from '@/lib/analytics';
import { applyFilters, DEFAULT_FILTERS, filtersFromParams, filtersToParams, toCsv } from '@/lib/filters';
import { formatMoney, parseMoney } from '@/lib/format';

const NOW = new Date('2026-11-05T15:00:00');
const data = generateDemoData(NOW);

describe('format', () => {
  it('formats cents with a true minus sign and optional plus', () => {
    expect(formatMoney(123456)).toBe('$1,234.56');
    expect(formatMoney(-500)).toBe('−$5.00');
    expect(formatMoney(500, { sign: true })).toBe('+$5.00');
  });

  it('parses user input into integer cents', () => {
    expect(parseMoney('1,250.5')).toBe(125050);
    expect(parseMoney('$0.07')).toBe(7);
    expect(parseMoney('12.345')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
  });
});

describe('demo data', () => {
  it('is deterministic for a given date', () => {
    expect(generateDemoData(NOW).transactions).toEqual(data.transactions);
  });

  it('never lets an account go negative over the year', () => {
    const history = balanceHistory(data.accounts, data.transactions, 330, NOW);
    for (const point of history) {
      for (const a of data.accounts) expect(point[a.id] as number).toBeGreaterThan(0);
    }
  });

  it('keeps both legs of every internal transfer balanced', () => {
    const groups = new Map<string, number>();
    for (const t of data.transactions) {
      if (t.transferGroup) groups.set(t.transferGroup, (groups.get(t.transferGroup) ?? 0) + t.amount);
    }
    expect(groups.size).toBeGreaterThan(10);
    for (const sum of groups.values()) expect(sum).toBe(0);
  });

  it('contains no future-dated transactions', () => {
    expect(data.transactions.every((t) => new Date(t.date) <= NOW)).toBe(true);
  });
});

describe('analytics', () => {
  const ops = data.accounts.find((a) => a.id === 'acc_ops')!;

  it('derives available balance from pending outflows', () => {
    const txns = [
      { ...data.transactions[0], id: 'x1', accountId: ops.id, amount: -100_00, status: 'pending' as const },
      { ...data.transactions[0], id: 'x2', accountId: ops.id, amount: 50_00, status: 'posted' as const },
    ];
    const b = accountBalance(ops, txns);
    expect(b.current).toBe(ops.openingBalance + 50_00);
    expect(b.available).toBe(ops.openingBalance + 50_00 - 100_00);
  });

  it('excludes internal transfers and failed items from cash flow', () => {
    const from = new Date('2026-01-01');
    const flow = cashFlow(data.transactions, from, NOW);
    const manual = data.transactions
      .filter((t) => t.category !== 'Transfer' && t.status !== 'failed' && new Date(t.date) >= from)
      .reduce((s, t) => s + t.amount, 0);
    expect(flow.net).toBe(manual);
  });

  it('returns one bucket per month with the current month marked partial', () => {
    const months = monthlyCashFlow(data.transactions, 6, NOW);
    expect(months).toHaveLength(6);
    expect(months.at(-1)?.partial).toBe(true);
    expect(months.slice(0, -1).every((m) => !m.partial)).toBe(true);
  });

  it('ranks spending categories and shares sum to 1', () => {
    const cats = spendingByCategory(data.transactions, new Date('2026-08-01'), NOW);
    expect(cats[0].amount).toBeGreaterThanOrEqual(cats[1].amount);
    expect(cats.reduce((s, c) => s + c.share, 0)).toBeCloseTo(1, 6);
    expect(cats.some((c) => c.category === 'Transfer')).toBe(false);
  });
});

describe('filters', () => {
  it('searches counterparty, reference and amount', () => {
    const aws = applyFilters(data.transactions, { ...DEFAULT_FILTERS, query: 'aws' }, NOW);
    expect(aws.length).toBeGreaterThan(0);
    expect(aws.every((t) => t.counterparty === 'AWS')).toBe(true);

    const ref = data.transactions[10].reference;
    expect(applyFilters(data.transactions, { ...DEFAULT_FILTERS, query: ref }, NOW).map((t) => t.id)).toContain(data.transactions[10].id);

    expect(applyFilters(data.transactions, { ...DEFAULT_FILTERS, query: '18500.00' }, NOW).every((t) => Math.abs(t.amount) === 18_500_00)).toBe(true);
  });

  it('combines direction, category, amount and range filters', () => {
    const result = applyFilters(
      data.transactions,
      { ...DEFAULT_FILTERS, direction: 'out', categories: ['Travel'], minAmount: 100, range: '90d' },
      NOW,
    );
    const cutoff = new Date(NOW);
    cutoff.setDate(cutoff.getDate() - 90);
    for (const t of result) {
      expect(t.amount).toBeLessThan(0);
      expect(t.category).toBe('Travel');
      expect(Math.abs(t.amount)).toBeGreaterThanOrEqual(100_00);
      expect(new Date(t.date) >= cutoff).toBe(true);
    }
  });

  it('sorts by amount ascending', () => {
    const sorted = applyFilters(data.transactions, { ...DEFAULT_FILTERS, sort: 'amount', desc: false }, NOW);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].amount).toBeGreaterThanOrEqual(sorted[i - 1].amount);
  });

  it('round-trips through URL params and ignores junk', () => {
    const f = { ...DEFAULT_FILTERS, query: 'stripe', accountId: 'acc_ops', categories: ['Revenue' as const], statuses: ['pending' as const], direction: 'in' as const, range: 'custom' as const, from: '2026-01-01', to: '2026-03-31', minAmount: 10 };
    expect(filtersFromParams(filtersToParams(f))).toEqual({ ...f, cardId: undefined, maxAmount: undefined });
    const junk = filtersFromParams(new URLSearchParams('category=Nope&status=weird&range=forever&min=abc'));
    expect(junk.categories).toEqual([]);
    expect(junk.statuses).toEqual([]);
    expect(junk.range).toBe('all');
    expect(junk.minAmount).toBeUndefined();
  });

  it('escapes CSV fields', () => {
    const csv = toCsv([{ ...data.transactions[0], description: 'Lunch, "team"' }], () => 'Operating');
    expect(csv.split('\n')[1]).toContain('"Lunch, ""team"""');
  });
});
