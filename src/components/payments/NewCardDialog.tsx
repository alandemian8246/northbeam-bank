import { useState, type FormEvent } from 'react';
import { BankError, useBank } from '@/store/bank';
import { useUi } from '@/store/ui';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { formatMoney, parseMoney } from '@/lib/format';
import { AmountInput } from './AmountInput';

const TEAM = ['Maya Chen', 'Priya Raman', 'Jordan Lee', 'Diego Alvarez', 'Sam Okafor'];

export function NewCardDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createCard = useBank((s) => s.createCard);
  const toast = useUi((s) => s.toast);
  const [nickname, setNickname] = useState('');
  const [holder, setHolder] = useState(TEAM[0]);
  const [type, setType] = useState<'virtual' | 'physical'>('virtual');
  const [limit, setLimit] = useState('5,000');
  const [error, setError] = useState<string>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cents = parseMoney(limit);
    if (!cents) return setError('Enter a monthly limit greater than $0.');
    try {
      const card = createCard({ nickname: nickname.trim(), holder, type, monthlyLimit: cents, accountId: 'acc_ops' });
      toast({
        title: type === 'virtual' ? 'Virtual card ready' : 'Physical card ordered',
        description: `${card.nickname} ••${card.last4} · ${formatMoney(cents)}/mo limit`,
      });
      setNickname('');
      setError(undefined);
      onClose();
    } catch (err) {
      setError(err instanceof BankError ? err.message : 'Something went wrong.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Issue a new card"
      description="Cards draw from Operating and respect the monthly limit you set."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="card-form">Create card</Button>
        </>
      }
    >
      <form id="card-form" onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="card-name" className="label">Card name</label>
          <input id="card-name" data-autofocus className="field" maxLength={40} value={nickname} onChange={(e) => { setNickname(e.target.value); setError(undefined); }} placeholder="e.g. Conference travel" />
        </div>
        <div>
          <label htmlFor="card-holder" className="label">Cardholder</label>
          <select id="card-holder" className="field" value={holder} onChange={(e) => setHolder(e.target.value)}>
            {TEAM.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <p className="label">Card type</p>
          <Segmented
            label="Card type"
            value={type}
            onChange={setType}
            options={[{ value: 'virtual', label: 'Virtual · instant' }, { value: 'physical', label: 'Physical · ships in 5 days' }]}
            className="w-full [&>button]:flex-1"
          />
        </div>
        <AmountInput label="Monthly limit" value={limit} onChange={(v) => { setLimit(v); setError(undefined); }} error={error} />
      </form>
    </Modal>
  );
}
