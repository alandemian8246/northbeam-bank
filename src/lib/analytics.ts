import { eachDayOfInterval, endOfDay, format, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';
import type { Account, Category, Cents, Transaction } from './types';

const counts = (t: Transaction) => t.status !== 'failed';
const isExternal = (t: Transaction) => t.category !== 'Transfer';

export interface Balance {
  /** Settled balance. */
  current: Cents;
  /** Settled balance minus outgoing pending items: what can be spent now. */
  available: Cents;
  pendingIn: Cents;
  pendingOut: Cents;
}

export function accountBalance(account: Account, txns: Transaction[]): Balance {
  let posted = 0;
  let pendingIn = 0;
  let pendingOut = 0;
  for (const t of txns) {
    if (t.accountId !== account.id) continue;
    if (t.status === 'posted') posted += t.amount;
    else if (t.status === 'pending') {
      if (t.amount > 0) pendingIn += t.amount;
      else pendingOut += t.amount;
    }
  }
  const current = account.openingBalance + posted;
  return { current, available: current + pendingOut, pendingIn, pendingOut };
}

export function totalBalance(accounts: Account[], txns: Transaction[]): Balance {
  return accounts.reduce<Balance>(
    (acc, a) => {
      const b = accountBalance(a, txns);
      return {
        current: acc.current + b.current,
        available: acc.available + b.available,
        pendingIn: acc.pendingIn + b.pendingIn,
        pendingOut: acc.pendingOut + b.pendingOut,
      };
    },
    { current: 0, available: 0, pendingIn: 0, pendingOut: 0 },
  );
}

export interface BalancePoint {
  date: string;
  label: string;
  total: Cents;
  [accountId: string]: Cents | string;
}

/** End-of-day settled balance per account for the trailing `days` days. */
export function balanceHistory(accounts: Account[], txns: Transaction[], days: number, now = new Date()): BalancePoint[] {
  const from = startOfDay(subDays(now, days - 1));
  const sorted = txns
    .filter((t) => t.status === 'posted')
    .map((t) => ({ t, time: new Date(t.date).getTime() }))
    .sort((a, b) => a.time - b.time);

  const running = new Map(accounts.map((a) => [a.id, a.openingBalance]));
  let i = 0;
  const points: BalancePoint[] = [];
  for (const day of eachDayOfInterval({ start: from, end: startOfDay(now) })) {
    const cutoff = endOfDay(day).getTime();
    while (i < sorted.length && sorted[i].time <= cutoff) {
      const { t } = sorted[i++];
      if (running.has(t.accountId)) running.set(t.accountId, running.get(t.accountId)! + t.amount);
    }
    const point: BalancePoint = { date: day.toISOString(), label: format(day, 'MMM d'), total: 0 };
    for (const a of accounts) {
      const v = running.get(a.id)!;
      point[a.id] = v;
      point.total += v;
    }
    points.push(point);
  }
  return points;
}

export interface Flow {
  moneyIn: Cents;
  moneyOut: Cents;
  net: Cents;
}

/** Money in/out excluding internal transfers, within [from, to). */
export function cashFlow(txns: Transaction[], from: Date, to: Date): Flow {
  let moneyIn = 0;
  let moneyOut = 0;
  const lo = from.getTime();
  const hi = to.getTime();
  for (const t of txns) {
    if (!counts(t) || !isExternal(t)) continue;
    const time = new Date(t.date).getTime();
    if (time < lo || time >= hi) continue;
    if (t.amount > 0) moneyIn += t.amount;
    else moneyOut += -t.amount;
  }
  return { moneyIn, moneyOut, net: moneyIn - moneyOut };
}

export interface MonthlyFlow extends Flow {
  month: string;
  label: string;
  partial: boolean;
}

export function monthlyCashFlow(txns: Transaction[], months: number, now = new Date()): MonthlyFlow[] {
  return Array.from({ length: months }, (_, i) => {
    const start = startOfMonth(subMonths(now, months - 1 - i));
    const end = startOfMonth(subMonths(now, months - 2 - i));
    return {
      month: start.toISOString(),
      label: format(start, 'MMM'),
      partial: i === months - 1,
      ...cashFlow(txns, start, end),
    };
  });
}

export interface CategorySpend {
  category: Category;
  amount: Cents;
  count: number;
  share: number;
}

export function spendingByCategory(txns: Transaction[], from: Date, to: Date): CategorySpend[] {
  const totals = new Map<Category, { amount: number; count: number }>();
  const lo = from.getTime();
  const hi = to.getTime();
  for (const t of txns) {
    if (!counts(t) || !isExternal(t) || t.amount >= 0) continue;
    const time = new Date(t.date).getTime();
    if (time < lo || time >= hi) continue;
    const cur = totals.get(t.category) ?? { amount: 0, count: 0 };
    cur.amount += -t.amount;
    cur.count += 1;
    totals.set(t.category, cur);
  }
  const sum = [...totals.values()].reduce((s, v) => s + v.amount, 0) || 1;
  return [...totals.entries()]
    .map(([category, v]) => ({ category, ...v, share: v.amount / sum }))
    .sort((a, b) => b.amount - a.amount);
}

export interface VendorSpend {
  name: string;
  amount: Cents;
  count: number;
  category: Category;
}

/** Largest vendors by spend; a vendor spanning categories (e.g. payroll + payroll tax) is labelled by its biggest one. */
export function topVendors(txns: Transaction[], from: Date, to: Date, limit = 6): VendorSpend[] {
  const totals = new Map<string, { amount: number; count: number; byCategory: Map<Category, number> }>();
  const lo = from.getTime();
  const hi = to.getTime();
  for (const t of txns) {
    if (!counts(t) || !isExternal(t) || t.amount >= 0) continue;
    const time = new Date(t.date).getTime();
    if (time < lo || time >= hi) continue;
    const cur = totals.get(t.counterparty) ?? { amount: 0, count: 0, byCategory: new Map() };
    cur.amount += -t.amount;
    cur.count += 1;
    cur.byCategory.set(t.category, (cur.byCategory.get(t.category) ?? 0) - t.amount);
    totals.set(t.counterparty, cur);
  }
  return [...totals.entries()]
    .map(([name, v]) => ({
      name,
      amount: v.amount,
      count: v.count,
      category: [...v.byCategory.entries()].sort((a, b) => b[1] - a[1])[0][0],
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export interface Runway {
  /** Average monthly net burn over the last three complete months (positive = burning). */
  avgBurn: Cents;
  /** Months of runway at that burn, or null when cash-flow positive. */
  months: number | null;
}

export function runway(txns: Transaction[], cash: Cents, now = new Date()): Runway {
  const complete = monthlyCashFlow(txns, 4, now).slice(0, 3);
  const avgBurn = Math.round(-complete.reduce((s, m) => s + m.net, 0) / complete.length);
  return { avgBurn, months: avgBurn > 0 ? cash / avgBurn : null };
}

export function cardSpend(txns: Transaction[], cardId: string, now = new Date()): Cents {
  const from = startOfMonth(now).getTime();
  return txns.reduce((s, t) => {
    if (t.cardId !== cardId || !counts(t) || t.amount >= 0) return s;
    return new Date(t.date).getTime() >= from ? s - t.amount : s;
  }, 0);
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

/** Posted interest credits within [from, to). */
export function interestEarned(txns: Transaction[], from: Date, to: Date, accountId?: string): Cents {
  const lo = from.getTime();
  const hi = to.getTime();
  return txns.reduce((s, t) => {
    if (t.category !== 'Interest' || t.status !== 'posted') return s;
    if (accountId && t.accountId !== accountId) return s;
    const time = new Date(t.date).getTime();
    return time >= lo && time < hi ? s + t.amount : s;
  }, 0);
}
