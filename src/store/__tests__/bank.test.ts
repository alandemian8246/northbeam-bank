import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { format, addDays } from 'date-fns';
import { BankError, SETTLEMENT_MS, useBank } from '@/store/bank';
import { accountBalance } from '@/lib/analytics';

const balance = (id: string) => {
  const { accounts, transactions } = useBank.getState();
  return accountBalance(accounts.find((a) => a.id === id)!, transactions);
};

describe('bank store', () => {
  beforeEach(() => useBank.getState().reset());
  afterEach(() => vi.useRealTimers());

  it('moves money between accounts instantly and conserves the total', () => {
    const before = balance('acc_ops').current + balance('acc_treasury').current;
    useBank.getState().transfer({ fromId: 'acc_ops', toId: 'acc_treasury', amount: 10_000_00 });
    const after = balance('acc_ops').current + balance('acc_treasury').current;
    expect(after).toBe(before);
    expect(useBank.getState().transactions.slice(0, 2).every((t) => t.status === 'posted')).toBe(true);
  });

  it('rejects transfers that exceed the available balance or target the same account', () => {
    const { transfer } = useBank.getState();
    const available = balance('acc_tax').available;
    expect(() => transfer({ fromId: 'acc_tax', toId: 'acc_ops', amount: available + 1 })).toThrow(BankError);
    expect(() => transfer({ fromId: 'acc_ops', toId: 'acc_ops', amount: 100 })).toThrow(/different/);
    expect(() => transfer({ fromId: 'acc_ops', toId: 'acc_tax', amount: 0 })).toThrow(BankError);
  });

  it('creates a pending payment that reduces available balance and settles later', () => {
    vi.useFakeTimers();
    const start = new Date();
    vi.setSystemTime(start);
    const before = balance('acc_ops');
    const res = useBank.getState().sendPayment({
      accountId: 'acc_ops', payeeId: 'pay_cooley', amount: 5_000_00, method: 'wire',
      date: format(start, 'yyyy-MM-dd'), frequency: 'once',
    });
    expect(res.kind).toBe('sent');
    expect(balance('acc_ops').available).toBe(before.available - 5_000_00);
    expect(balance('acc_ops').current).toBe(before.current);

    expect(useBank.getState().settleDue(new Date(start.getTime() + SETTLEMENT_MS.wire - 1))).toBe(0);
    expect(useBank.getState().settleDue(new Date(start.getTime() + SETTLEMENT_MS.wire))).toBeGreaterThanOrEqual(1);
    expect(useBank.getState().transactions.find((t) => t.id === res.transactionId)?.status).toBe('posted');
    expect(balance('acc_ops').current).toBe(before.current - 5_000_00);
  });

  it('schedules future and recurring payments without moving money now', () => {
    const before = balance('acc_ops').available;
    const count = useBank.getState().scheduled.length;
    const res = useBank.getState().sendPayment({
      accountId: 'acc_ops', payeeId: 'pay_pilot', amount: 1_500_00, method: 'ach',
      date: format(addDays(new Date(), 3), 'yyyy-MM-dd'), frequency: 'monthly',
    });
    expect(res.kind).toBe('scheduled');
    expect(balance('acc_ops').available).toBe(before);
    expect(useBank.getState().scheduled).toHaveLength(count + 1);
  });

  it('rejects past-dated payments', () => {
    expect(() =>
      useBank.getState().sendPayment({
        accountId: 'acc_ops', payeeId: 'pay_pilot', amount: 100, method: 'ach',
        date: format(addDays(new Date(), -1), 'yyyy-MM-dd'), frequency: 'once',
      }),
    ).toThrow(/past/);
  });

  it('freezes cards and validates limits', () => {
    const { toggleCardFreeze, setCardLimit } = useBank.getState();
    toggleCardFreeze('card_saas');
    expect(useBank.getState().cards.find((c) => c.id === 'card_saas')?.frozen).toBe(true);
    setCardLimit('card_saas', 12_000_00);
    expect(useBank.getState().cards.find((c) => c.id === 'card_saas')?.monthlyLimit).toBe(12_000_00);
    expect(() => setCardLimit('card_saas', 0)).toThrow(BankError);
  });
});
