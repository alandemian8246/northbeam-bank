import { addDays, endOfMonth, setDate, startOfDay, startOfMonth, subMonths } from 'date-fns';
import { createRng, type Rng } from '@/lib/random';
import type {
  Account,
  Card,
  Category,
  Cents,
  Payee,
  ScheduledPayment,
  Transaction,
  TxnMethod,
} from '@/lib/types';

export interface BankData {
  accounts: Account[];
  transactions: Transaction[];
  cards: Card[];
  payees: Payee[];
  scheduled: ScheduledPayment[];
}

export const COMPANY = { name: 'Northbeam Labs, Inc.', short: 'Northbeam Labs', ein: '••-•••4417' };

export const ACCOUNTS: Account[] = [
  { id: 'acc_ops', name: 'Operating', kind: 'checking', last4: '4021', routing: '091311229', openingBalance: 1_840_000_00, color: 'series-1' },
  { id: 'acc_payroll', name: 'Payroll', kind: 'checking', last4: '7733', routing: '091311229', openingBalance: 95_000_00, color: 'series-2' },
  { id: 'acc_treasury', name: 'Treasury', kind: 'treasury', last4: '9180', routing: '091311229', openingBalance: 2_400_000_00, apy: 0.0412, color: 'series-3' },
  { id: 'acc_tax', name: 'Tax Reserve', kind: 'savings', last4: '5512', routing: '091311229', openingBalance: 60_000_00, apy: 0.031, color: 'series-4' },
];

export const CARDS: Card[] = [
  { id: 'card_infra', accountId: 'acc_ops', holder: 'Priya Raman', nickname: 'Cloud infrastructure', last4: '8812', type: 'virtual', monthlyLimit: 40_000_00, frozen: false, expires: '09/28' },
  { id: 'card_saas', accountId: 'acc_ops', holder: 'Jordan Lee', nickname: 'SaaS subscriptions', last4: '2290', type: 'virtual', monthlyLimit: 10_000_00, frozen: false, expires: '03/29' },
  { id: 'card_mkt', accountId: 'acc_ops', holder: 'Diego Alvarez', nickname: 'Paid acquisition', last4: '6157', type: 'virtual', monthlyLimit: 25_000_00, frozen: false, expires: '11/27' },
  { id: 'card_maya', accountId: 'acc_ops', holder: 'Maya Chen', nickname: 'Maya — travel & meals', last4: '4403', type: 'physical', monthlyLimit: 8_000_00, frozen: false, expires: '06/28' },
  { id: 'card_office', accountId: 'acc_ops', holder: 'Jordan Lee', nickname: 'Office & supplies', last4: '7731', type: 'physical', monthlyLimit: 5_000_00, frozen: true, expires: '01/28' },
];

export const PAYEES: Payee[] = [
  { id: 'pay_lakeview', name: 'Lakeview Properties LLC', bank: 'Chase', last4: '3381', defaultMethod: 'ach', category: 'Rent & Office' },
  { id: 'pay_cooley', name: 'Cooley LLP', bank: 'Wells Fargo', last4: '0921', defaultMethod: 'wire', category: 'Professional Services' },
  { id: 'pay_pilot', name: 'Pilot Bookkeeping', bank: 'SVB', last4: '6620', defaultMethod: 'ach', category: 'Professional Services' },
  { id: 'pay_vouch', name: 'Vouch Insurance', bank: 'Bank of America', last4: '1147', defaultMethod: 'ach', category: 'Insurance' },
  { id: 'pay_studio', name: 'Fieldwork Design Studio', bank: 'Citi', last4: '5502', defaultMethod: 'ach', category: 'Professional Services' },
  { id: 'pay_contractor', name: 'Ana Sokolova (contractor)', bank: 'Revolut', last4: '7719', defaultMethod: 'wire', category: 'Payroll' },
];

const CUSTOMERS = ['Halcyon Health', 'Orbital Freight', 'Brightline Retail', 'Meridian Capital', 'Kestrel Bio', 'Tandem Logistics'];
const SAAS: Array<[string, number]> = [
  ['Slack', 1_240_00], ['Figma', 900_00], ['GitHub', 630_00], ['Notion', 480_00],
  ['Linear', 320_00], ['Google Workspace', 1_080_00], ['1Password', 190_00], ['Loom', 150_00],
];
const TRAVEL: Array<[string, number, number]> = [
  ['Delta Air Lines', 280, 1450], ['United Airlines', 240, 1300], ['Uber', 14, 85], ['Lyft', 12, 70],
  ['Airbnb', 320, 1800], ['Marriott Hotels', 220, 900],
];
const MEALS: Array<[string, number, number]> = [
  ['Sweetgreen', 14, 160], ['Blue Bottle Coffee', 6, 48], ['DoorDash', 25, 320], ['Tartine Bakery', 12, 90],
];

interface Draft {
  accountId: string;
  date: Date;
  description: string;
  counterparty: string;
  amount: Cents;
  category: Category;
  method: TxnMethod;
  cardId?: string;
  transferGroup?: string;
}

function businessHour(rng: Rng, day: Date): Date {
  const d = new Date(day);
  d.setHours(rng.int(7, 19), rng.int(0, 59), rng.int(0, 59), 0);
  return d;
}

function reference(rng: Rng): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(rng.next() * chars.length)]).join('');
}

const dollars = (rng: Rng, min: number, max: number): Cents => Math.round(rng.between(min, max) * 100);

/**
 * Builds twelve months of realistic activity for a Series A software company,
 * ending at `now`. Deterministic for a given seed.
 */
export function generateDemoData(now: Date = new Date(), seed = 20241105): BankData {
  const rng = createRng(seed);
  const drafts: Draft[] = [];
  const today = startOfDay(now);
  const start = startOfMonth(subMonths(today, 11));
  const running = new Map(ACCOUNTS.map((a) => [a.id, a.openingBalance]));

  const add = (d: Draft) => {
    if (d.date > now) return;
    drafts.push(d);
    running.set(d.accountId, (running.get(d.accountId) ?? 0) + d.amount);
  };

  const transfer = (from: string, to: string, amount: Cents, date: Date, label: string) => {
    const group = `grp_${reference(rng)}`;
    const fromName = ACCOUNTS.find((a) => a.id === from)!.name;
    const toName = ACCOUNTS.find((a) => a.id === to)!.name;
    add({ accountId: from, date, description: `${label} → ${toName}`, counterparty: `${toName} ••${ACCOUNTS.find((a) => a.id === to)!.last4}`, amount: -amount, category: 'Transfer', method: 'transfer', transferGroup: group });
    add({ accountId: to, date, description: `${label} ← ${fromName}`, counterparty: `${fromName} ••${ACCOUNTS.find((a) => a.id === from)!.last4}`, amount, category: 'Transfer', method: 'transfer', transferGroup: group });
  };

  for (let m = 0; m < 12; m++) {
    const monthStart = startOfMonth(subMonths(today, 11 - m));
    const monthEnd = endOfMonth(monthStart);
    const growth = Math.pow(1.035, m);
    const headcount = Math.pow(1.02, m);
    const dayOf = (n: number) => businessHour(rng, setDate(monthStart, Math.min(n, monthEnd.getDate())));

    // Revenue: Stripe payouts every few days + enterprise invoices paid by wire/ACH.
    for (let day = 2; day <= monthEnd.getDate(); day += rng.int(2, 4)) {
      add({ accountId: 'acc_ops', date: dayOf(day), description: 'Stripe payout', counterparty: 'Stripe', amount: Math.round(dollars(rng, 5_000, 10_500) * growth), category: 'Revenue', method: 'ach' });
    }
    // Two enterprise invoices a month, one paid in each half, so trailing-30-day comparisons stay meaningful.
    for (const [lo, hi] of [[3, 14], [15, 27]]) {
      const customer = rng.pick(CUSTOMERS);
      const wire = rng.chance(0.5);
      add({ accountId: 'acc_ops', date: dayOf(rng.int(lo, hi)), description: `${customer} — invoice INV-${rng.int(1040, 1990)}`, counterparty: customer, amount: Math.round(dollars(rng, 18_000, 52_000) * growth), category: 'Revenue', method: wire ? 'wire' : 'ach' });
    }

    // Payroll: fund the payroll account, then run payroll on the 15th and last day.
    for (const payday of [15, monthEnd.getDate()]) {
      const net = Math.round(dollars(rng, 76_000, 80_000) * headcount);
      const taxes = Math.round(net * 0.24);
      transfer('acc_ops', 'acc_payroll', net + taxes, dayOf(payday - 2), 'Payroll funding');
      add({ accountId: 'acc_payroll', date: dayOf(payday), description: 'Gusto — net pay', counterparty: 'Gusto', amount: -net, category: 'Payroll', method: 'ach' });
      add({ accountId: 'acc_payroll', date: dayOf(payday), description: 'Gusto — payroll taxes', counterparty: 'Gusto', amount: -taxes, category: 'Taxes', method: 'ach' });
    }

    // Fixed operating costs.
    add({ accountId: 'acc_ops', date: dayOf(1), description: 'Office rent — 220 Harbor St', counterparty: 'Lakeview Properties LLC', amount: -18_500_00, category: 'Rent & Office', method: 'ach' });
    add({ accountId: 'acc_ops', date: dayOf(5), description: 'Monthly premium', counterparty: 'Vouch Insurance', amount: -2_350_00, category: 'Insurance', method: 'ach' });
    add({ accountId: 'acc_ops', date: dayOf(8), description: 'Bookkeeping & tax prep', counterparty: 'Pilot Bookkeeping', amount: -1_500_00, category: 'Professional Services', method: 'ach' });
    add({ accountId: 'acc_ops', date: dayOf(rng.int(10, 20)), description: 'Legal services', counterparty: 'Cooley LLP', amount: -dollars(rng, 4_500, 14_000), category: 'Professional Services', method: 'wire' });
    transfer('acc_ops', 'acc_tax', 15_000_00, dayOf(20), 'Tax set-aside');

    // Card spend.
    add({ accountId: 'acc_ops', date: dayOf(3), description: 'Amazon Web Services', counterparty: 'AWS', amount: -Math.round(dollars(rng, 13_000, 17_500) * growth), category: 'Infrastructure', method: 'card', cardId: 'card_infra' });
    add({ accountId: 'acc_ops', date: dayOf(4), description: 'Google Cloud Platform', counterparty: 'Google Cloud', amount: -dollars(rng, 2_800, 4_900), category: 'Infrastructure', method: 'card', cardId: 'card_infra' });
    add({ accountId: 'acc_ops', date: dayOf(6), description: 'Datadog', counterparty: 'Datadog', amount: -dollars(rng, 2_100, 3_100), category: 'Infrastructure', method: 'card', cardId: 'card_infra' });
    add({ accountId: 'acc_ops', date: dayOf(9), description: 'Vercel', counterparty: 'Vercel', amount: -dollars(rng, 600, 1_100), category: 'Infrastructure', method: 'card', cardId: 'card_infra' });
    for (const [vendor, cost] of SAAS) {
      add({ accountId: 'acc_ops', date: dayOf(rng.int(1, 12)), description: vendor, counterparty: vendor, amount: -Math.round(cost * headcount), category: 'Software', method: 'card', cardId: 'card_saas' });
    }
    for (let i = 0, n = rng.int(2, 4); i < n; i++) {
      const [vendor, lo, hi] = rng.pick([['Google Ads', 2_500, 8_500], ['LinkedIn Ads', 1_800, 5_500], ['Meta Ads', 900, 3_200]] as const);
      add({ accountId: 'acc_ops', date: dayOf(rng.int(1, 28)), description: vendor, counterparty: vendor, amount: -dollars(rng, lo, hi), category: 'Marketing', method: 'card', cardId: 'card_mkt' });
    }
    for (let i = 0, n = rng.int(4, 9); i < n; i++) {
      const [vendor, lo, hi] = rng.pick(TRAVEL);
      add({ accountId: 'acc_ops', date: dayOf(rng.int(1, 28)), description: vendor, counterparty: vendor, amount: -dollars(rng, lo, hi), category: 'Travel', method: 'card', cardId: 'card_maya' });
    }
    for (let i = 0, n = rng.int(6, 14); i < n; i++) {
      const [vendor, lo, hi] = rng.pick(MEALS);
      add({ accountId: 'acc_ops', date: dayOf(rng.int(1, 28)), description: vendor, counterparty: vendor, amount: -dollars(rng, lo, hi), category: 'Meals', method: 'card', cardId: rng.chance(0.7) ? 'card_maya' : 'card_office' });
    }
    if (rng.chance(0.6)) {
      add({ accountId: 'acc_ops', date: dayOf(rng.int(1, 28)), description: rng.pick(['WeWork On Demand', 'Staples', 'Apple Store', 'IKEA Business']), counterparty: 'Office supplies', amount: -dollars(rng, 90, 2_400), category: 'Rent & Office', method: 'card', cardId: 'card_office' });
    }

    // Quarterly estimated taxes from the reserve; quarterly T-bill redemptions top up Operating.
    if ([0, 3, 6, 9].includes(monthStart.getMonth())) {
      add({ accountId: 'acc_tax', date: dayOf(15), description: 'IRS — estimated tax payment', counterparty: 'IRS EFTPS', amount: -dollars(rng, 38_000, 44_000), category: 'Taxes', method: 'ach' });
    }
    if (m % 3 === 1) transfer('acc_treasury', 'acc_ops', 400_000_00, dayOf(22), 'Treasury redemption');

    // Interest accrues on yield-bearing accounts, credited on the last day.
    for (const acct of ACCOUNTS.filter((a) => a.apy)) {
      const interest = Math.round(((running.get(acct.id) ?? 0) * acct.apy!) / 12);
      add({ accountId: acct.id, date: businessHour(rng, monthEnd), description: 'Interest earned', counterparty: 'Ledgerline', amount: interest, category: 'Interest', method: 'interest' });
    }
  }

  const transactions: Transaction[] = drafts
    .filter((d) => d.date >= start)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((d, i) => {
      const ageDays = (now.getTime() - d.date.getTime()) / 86_400_000;
      // Recent card and ACH activity hasn't cleared yet.
      const pending = ageDays < 2 && d.method !== 'interest' && d.method !== 'transfer';
      return {
        id: `txn_${i.toString().padStart(5, '0')}`,
        accountId: d.accountId,
        date: d.date.toISOString(),
        description: d.description,
        counterparty: d.counterparty,
        amount: d.amount,
        category: d.category,
        status: pending ? 'pending' : 'posted',
        method: d.method,
        cardId: d.cardId,
        reference: reference(rng),
        transferGroup: d.transferGroup,
        hasReceipt: d.method === 'card' ? rng.chance(0.65) : undefined,
        settlesAt: pending ? addDays(d.date, 2).toISOString() : undefined,
      };
    });

  // A couple of declined card attempts make the status filter meaningful.
  const declined = transactions.filter((t) => t.method === 'card' && t.category === 'Travel').slice(4, 6);
  for (const t of declined) t.status = 'failed';

  const scheduled: ScheduledPayment[] = [
    { id: 'sch_rent', payeeId: 'pay_lakeview', accountId: 'acc_ops', amount: 18_500_00, method: 'ach', nextDate: startOfMonth(addDays(endOfMonth(today), 1)).toISOString(), frequency: 'monthly', memo: 'Office rent — 220 Harbor St' },
    { id: 'sch_vouch', payeeId: 'pay_vouch', accountId: 'acc_ops', amount: 2_350_00, method: 'ach', nextDate: setDate(addDays(endOfMonth(today), 1), 5).toISOString(), frequency: 'monthly', memo: 'Monthly premium' },
    { id: 'sch_contractor', payeeId: 'pay_contractor', accountId: 'acc_ops', amount: 6_200_00, method: 'wire', nextDate: addDays(today, 6).toISOString(), frequency: 'monthly', memo: 'Design systems contract' },
  ];

  return { accounts: ACCOUNTS, transactions, cards: CARDS, payees: PAYEES, scheduled };
}
