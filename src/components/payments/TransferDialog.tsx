import { useState, type FormEvent } from 'react';
import { ArrowDownUp } from 'lucide-react';
import { BankError, useBank } from '@/store/bank';
import { useUi } from '@/store/ui';
import { useBalances } from '@/hooks/useBank';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { formatMoney, maskAccount, parseMoney } from '@/lib/format';
import { AmountInput } from './AmountInput';

export function TransferDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const accounts = useBank((s) => s.accounts);
  const transfer = useBank((s) => s.transfer);
  const toast = useUi((s) => s.toast);
  const { byAccount } = useBalances();
  const [fromId, setFromId] = useState('acc_ops');
  const [toId, setToId] = useState('acc_treasury');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string>();

  const available = byAccount.get(fromId)?.available ?? 0;
  const cents = parseMoney(amount);

  const reset = () => {
    setAmount('');
    setMemo('');
    setError(undefined);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!cents) return setError('Enter an amount greater than $0.');
    try {
      transfer({ fromId, toId, amount: cents, memo });
      const to = accounts.find((a) => a.id === toId)!;
      toast({ title: 'Transfer complete', description: `${formatMoney(cents)} moved to ${to.name}. Internal transfers are instant.` });
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof BankError ? err.message : 'Something went wrong. Try again.');
    }
  };

  const option = (id: string) => {
    const a = accounts.find((x) => x.id === id)!;
    return `${a.name} ${maskAccount(a.last4)} · ${formatMoney(byAccount.get(id)?.available ?? 0)}`;
  };

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Transfer between accounts"
      description="Move money instantly between your Ledgerline accounts."
      footer={
        <>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button variant="primary" type="submit" form="transfer-form">Transfer {cents ? formatMoney(cents) : ''}</Button>
        </>
      }
    >
      <form id="transfer-form" onSubmit={submit} className="space-y-4">
        <div className="relative space-y-3">
          <div>
            <label htmlFor="tr-from" className="label">From</label>
            <select id="tr-from" className="field" value={fromId} onChange={(e) => { setFromId(e.target.value); setError(undefined); }}>
              {accounts.map((a) => <option key={a.id} value={a.id} disabled={a.id === toId}>{option(a.id)}</option>)}
            </select>
          </div>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => { setFromId(toId); setToId(fromId); }}
              className="rounded-full border border-line bg-surface p-1.5 text-ink-3 hover:text-ink"
              aria-label="Swap accounts"
            >
              <ArrowDownUp className="h-3.5 w-3.5" />
            </button>
          </div>
          <div>
            <label htmlFor="tr-to" className="label">To</label>
            <select id="tr-to" className="field" value={toId} onChange={(e) => { setToId(e.target.value); setError(undefined); }}>
              {accounts.map((a) => <option key={a.id} value={a.id} disabled={a.id === fromId}>{option(a.id)}</option>)}
            </select>
          </div>
        </div>
        <AmountInput
          label="Amount"
          value={amount}
          onChange={(v) => { setAmount(v); setError(undefined); }}
          error={error}
          hint={`${formatMoney(available)} available`}
          autoFocus
        />
        <div>
          <label htmlFor="tr-memo" className="label">Memo <span className="font-normal text-ink-3">(optional)</span></label>
          <input id="tr-memo" className="field" value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={60} placeholder="e.g. Q4 treasury sweep" />
        </div>
      </form>
    </Modal>
  );
}
