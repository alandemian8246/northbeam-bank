import type { Cents } from './types';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatMoney(cents: Cents, opts: { sign?: boolean; compact?: boolean } = {}): string {
  const value = cents / 100;
  const body = (opts.compact ? usdCompact : usd).format(Math.abs(value));
  if (value < 0) return `−${body}`;
  if (opts.sign && value > 0) return `+${body}`;
  return body;
}

/** Parse a user-entered dollar string into cents; returns null when invalid. */
export function parseMoney(input: string): Cents | null {
  const cleaned = input.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

export function formatPercent(ratio: number, digits = 1): string {
  const pct = ratio * 100;
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${Math.abs(pct).toFixed(digits)}%`;
}

export function maskAccount(last4: string): string {
  return `••${last4}`;
}
