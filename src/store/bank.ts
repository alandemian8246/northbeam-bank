import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { addMonths, addWeeks, isAfter, startOfDay } from 'date-fns';
import { generateDemoData, type BankData } from '@/data/generate';
import { accountBalance } from '@/lib/analytics';
import { uid } from '@/lib/random';
import type { Card, Category, Cents, Frequency, Payee, Transaction } from '@/lib/types';

/** Simulated settlement windows (shortened so the demo shows state changes live). */
export const SETTLEMENT_MS = { ach: 30_000, wire: 10_000 } as const;

export class BankError extends Error {}

export interface TransferInput {
  fromId: string;
  toId: string;
  amount: Cents;
  memo?: string;
}

export interface PaymentInput {
  accountId: string;
  payeeId: string;
  amount: Cents;
  method: 'ach' | 'wire';
  /** yyyy-MM-dd; today or later. */
  date: string;
  frequency: Frequency;
  memo?: string;
}

export interface PaymentResult {
  kind: 'sent' | 'scheduled';
  transactionId?: string;
}

interface BankState extends BankData {
  generatedAt: string;
  transfer: (input: TransferInput) => void;
  sendPayment: (input: PaymentInput) => PaymentResult;
  addPayee: (payee: Omit<Payee, 'id'>) => Payee;
  cancelScheduled: (id: string) => void;
  settleDue: (now?: Date) => number;
  updateTransaction: (id: string, patch: Partial<Pick<Transaction, 'note' | 'category' | 'hasReceipt'>>) => void;
  toggleCardFreeze: (id: string) => void;
  setCardLimit: (id: string, limit: Cents) => void;
  createCard: (card: Omit<Card, 'id' | 'last4' | 'frozen' | 'expires'>) => Card;
  reset: () => void;
}

const fresh = () => ({ ...generateDemoData(new Date()), generatedAt: new Date().toISOString() });
const reference = () => uid('').slice(1, 11).toUpperCase();

export const useBank = create<BankState>()(
  persist(
    (set, get) => ({
      ...fresh(),

      transfer: ({ fromId, toId, amount, memo }) => {
        const { accounts, transactions } = get();
        const from = accounts.find((a) => a.id === fromId);
        const to = accounts.find((a) => a.id === toId);
        if (!from || !to) throw new BankError('Choose both accounts.');
        if (fromId === toId) throw new BankError('Choose two different accounts.');
        if (amount <= 0) throw new BankError('Enter an amount greater than $0.');
        if (accountBalance(from, transactions).available < amount) {
          throw new BankError(`Insufficient available balance in ${from.name}.`);
        }
        const now = new Date().toISOString();
        const group = uid('grp');
        const label = memo?.trim() || 'Internal transfer';
        const legs: Transaction[] = [
          { id: uid('txn'), accountId: from.id, date: now, description: `${label} → ${to.name}`, counterparty: `${to.name} ••${to.last4}`, amount: -amount, category: 'Transfer', status: 'posted', method: 'transfer', reference: reference(), transferGroup: group },
          { id: uid('txn'), accountId: to.id, date: now, description: `${label} ← ${from.name}`, counterparty: `${from.name} ••${from.last4}`, amount, category: 'Transfer', status: 'posted', method: 'transfer', reference: reference(), transferGroup: group },
        ];
        set({ transactions: [...legs, ...transactions] });
      },

      sendPayment: (input) => {
        const { accounts, payees, transactions, scheduled } = get();
        const account = accounts.find((a) => a.id === input.accountId);
        const payee = payees.find((p) => p.id === input.payeeId);
        if (!account) throw new BankError('Choose an account to pay from.');
        if (!payee) throw new BankError('Choose a recipient.');
        if (input.amount <= 0) throw new BankError('Enter an amount greater than $0.');

        const today = startOfDay(new Date());
        const when = startOfDay(new Date(`${input.date}T00:00:00`));
        if (when < today) throw new BankError('Payment date cannot be in the past.');
        const future = isAfter(when, today);

        if (!future && accountBalance(account, transactions).available < input.amount) {
          throw new BankError(`Insufficient available balance in ${account.name}.`);
        }

        let transactionId: string | undefined;
        let nextTransactions = transactions;
        if (!future) {
          const now = new Date();
          transactionId = uid('txn');
          nextTransactions = [
            {
              id: transactionId,
              accountId: account.id,
              date: now.toISOString(),
              description: input.memo?.trim() || `Payment to ${payee.name}`,
              counterparty: payee.name,
              amount: -input.amount,
              category: payee.category,
              status: 'pending',
              method: input.method,
              reference: reference(),
              settlesAt: new Date(now.getTime() + SETTLEMENT_MS[input.method]).toISOString(),
            },
            ...transactions,
          ];
        }

        const recurringNext = (base: Date) =>
          input.frequency === 'weekly' ? addWeeks(base, 1) : addMonths(base, 1);
        const needsSchedule = future || input.frequency !== 'once';
        const nextScheduled = needsSchedule
          ? [
              ...scheduled,
              {
                id: uid('sch'),
                payeeId: payee.id,
                accountId: account.id,
                amount: input.amount,
                method: input.method,
                nextDate: (future ? when : recurringNext(when)).toISOString(),
                frequency: input.frequency,
                memo: input.memo?.trim() || undefined,
              },
            ]
          : scheduled;

        set({ transactions: nextTransactions, scheduled: nextScheduled });
        return { kind: future ? 'scheduled' : 'sent', transactionId };
      },

      addPayee: (payee) => {
        const created = { ...payee, id: uid('pay') };
        set({ payees: [...get().payees, created] });
        return created;
      },

      cancelScheduled: (id) => set({ scheduled: get().scheduled.filter((s) => s.id !== id) }),

      settleDue: (now = new Date()) => {
        let settled = 0;
        const transactions = get().transactions.map((t) => {
          if (t.status === 'pending' && t.settlesAt && new Date(t.settlesAt) <= now) {
            settled++;
            return { ...t, status: 'posted' as const, settlesAt: undefined };
          }
          return t;
        });
        if (settled) set({ transactions });
        return settled;
      },

      updateTransaction: (id, patch) =>
        set({ transactions: get().transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),

      toggleCardFreeze: (id) =>
        set({ cards: get().cards.map((c) => (c.id === id ? { ...c, frozen: !c.frozen } : c)) }),

      setCardLimit: (id, limit) => {
        if (limit <= 0) throw new BankError('Limit must be greater than $0.');
        set({ cards: get().cards.map((c) => (c.id === id ? { ...c, monthlyLimit: limit } : c)) });
      },

      createCard: (input) => {
        if (!input.nickname.trim()) throw new BankError('Give the card a name.');
        if (input.monthlyLimit <= 0) throw new BankError('Limit must be greater than $0.');
        const exp = addMonths(new Date(), 36);
        const card: Card = {
          ...input,
          id: uid('card'),
          last4: String(Math.floor(1000 + Math.random() * 9000)),
          frozen: false,
          expires: `${String(exp.getMonth() + 1).padStart(2, '0')}/${String(exp.getFullYear()).slice(-2)}`,
        };
        set({ cards: [card, ...get().cards] });
        return card;
      },

      reset: () => set(fresh()),
    }),
    {
      name: 'ledgerline-bank-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ accounts, transactions, cards, payees, scheduled, generatedAt }) => ({
        accounts, transactions, cards, payees, scheduled, generatedAt,
      }),
      // Sample data is generated relative to "today"; refresh it if a visitor returns days later
      // so recent-activity views never look empty.
      onRehydrateStorage: () => (state) => {
        if (state && Date.now() - new Date(state.generatedAt).getTime() > 3 * 86_400_000) state.reset();
      },
    },
  ),
);

/** Category choices offered when re-categorising a transaction. */
export const EDITABLE_CATEGORIES: Category[] = [
  'Revenue', 'Payroll', 'Software', 'Infrastructure', 'Rent & Office', 'Marketing',
  'Travel', 'Meals', 'Professional Services', 'Taxes', 'Insurance',
];
