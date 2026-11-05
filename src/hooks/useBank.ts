import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBank } from '@/store/bank';
import { useUi } from '@/store/ui';
import { accountBalance, totalBalance } from '@/lib/analytics';
import { formatMoney } from '@/lib/format';

export function useAccountLookup() {
  const accounts = useBank((s) => s.accounts);
  return useCallback((id: string) => accounts.find((a) => a.id === id), [accounts]);
}

export function useBalances() {
  const accounts = useBank((s) => s.accounts);
  const transactions = useBank((s) => s.transactions);
  return useMemo(
    () => ({
      byAccount: new Map(accounts.map((a) => [a.id, accountBalance(a, transactions)])),
      total: totalBalance(accounts, transactions),
    }),
    [accounts, transactions],
  );
}

/** Polls pending transactions and settles any whose window has elapsed, announcing each one. */
export function useSettlementTicker(intervalMs = 2000) {
  useEffect(() => {
    const tick = () => {
      const before = useBank.getState().transactions.filter((t) => t.status === 'pending');
      if (!useBank.getState().settleDue()) return;
      const after = new Map(useBank.getState().transactions.map((t) => [t.id, t.status]));
      for (const t of before) {
        if (after.get(t.id) === 'posted' && t.settlesAt) {
          useUi.getState().toast({
            title: 'Payment settled',
            description: `${formatMoney(-t.amount)} to ${t.counterparty} has posted.`,
          });
        }
      }
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

/** Re-renders periodically so relative times ("settles in 12s") stay fresh. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useHotkey(key: string, handler: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === key) {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key, handler]);
}
