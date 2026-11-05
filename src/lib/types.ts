/** All monetary values are stored as integer cents to avoid floating point drift. */
export type Cents = number;

export type AccountKind = 'checking' | 'savings' | 'treasury' | 'credit';

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  last4: string;
  routing: string;
  /** Balance before the first generated transaction; current balance is derived. */
  openingBalance: Cents;
  apy?: number;
  color: string;
}

export type TxnStatus = 'posted' | 'pending' | 'failed';
export type TxnMethod = 'ach' | 'wire' | 'card' | 'transfer' | 'check' | 'interest';

export const CATEGORIES = [
  'Revenue',
  'Payroll',
  'Software',
  'Infrastructure',
  'Rent & Office',
  'Marketing',
  'Travel',
  'Meals',
  'Professional Services',
  'Taxes',
  'Insurance',
  'Interest',
  'Transfer',
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Transaction {
  id: string;
  accountId: string;
  /** ISO timestamp */
  date: string;
  description: string;
  counterparty: string;
  /** Positive = money in, negative = money out */
  amount: Cents;
  category: Category;
  status: TxnStatus;
  method: TxnMethod;
  cardId?: string;
  reference: string;
  note?: string;
  /** When a pending transaction should settle (ISO). */
  settlesAt?: string;
  /** Links the two legs of an internal transfer. */
  transferGroup?: string;
  hasReceipt?: boolean;
}

export interface Card {
  id: string;
  accountId: string;
  holder: string;
  nickname: string;
  last4: string;
  type: 'virtual' | 'physical';
  monthlyLimit: Cents;
  frozen: boolean;
  expires: string;
}

export interface Payee {
  id: string;
  name: string;
  bank: string;
  last4: string;
  defaultMethod: 'ach' | 'wire';
  category: Category;
}

export type Frequency = 'once' | 'weekly' | 'monthly';

export interface ScheduledPayment {
  id: string;
  payeeId: string;
  accountId: string;
  amount: Cents;
  method: 'ach' | 'wire';
  nextDate: string;
  frequency: Frequency;
  memo?: string;
}
