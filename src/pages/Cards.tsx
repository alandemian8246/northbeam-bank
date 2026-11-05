import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, Pencil, Plus, Snowflake } from 'lucide-react';
import { BankError, useBank } from '@/store/bank';
import { useUi } from '@/store/ui';
import { cardSpend } from '@/lib/analytics';
import { formatMoney, parseMoney } from '@/lib/format';
import type { Card as BankCard } from '@/lib/types';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Modal } from '@/components/ui/Overlay';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardVisual } from '@/components/payments/CardVisual';
import { AmountInput } from '@/components/payments/AmountInput';

type Filter = 'all' | 'virtual' | 'physical' | 'frozen';

function LimitDialog({ card, onClose }: { card: BankCard; onClose: () => void }) {
  const setCardLimit = useBank((s) => s.setCardLimit);
  const toast = useUi((s) => s.toast);
  const [value, setValue] = useState((card.monthlyLimit / 100).toLocaleString('en-US'));
  const [error, setError] = useState<string>();
  const save = () => {
    try {
      const cents = parseMoney(value);
      if (!cents) throw new BankError('Enter a limit greater than $0.');
      setCardLimit(card.id, cents);
      toast({ title: 'Limit updated', description: `${card.nickname} now has a ${formatMoney(cents)} monthly limit.` });
      onClose();
    } catch (err) {
      setError(err instanceof BankError ? err.message : 'Something went wrong.');
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Edit monthly limit"
      description={`${card.nickname} ••${card.last4}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save limit</Button></>}
    >
      <form onSubmit={(e) => { e.preventDefault(); save(); }}>
        <AmountInput label="Monthly limit" value={value} onChange={(v) => { setValue(v); setError(undefined); }} error={error} hint="Resets on the 1st of each month." autoFocus />
      </form>
    </Modal>
  );
}

export default function Cards() {
  const cards = useBank((s) => s.cards);
  const transactions = useBank((s) => s.transactions);
  const toggleCardFreeze = useBank((s) => s.toggleCardFreeze);
  const openDialog = useUi((s) => s.openDialog);
  const toast = useUi((s) => s.toast);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<BankCard | null>(null);

  const spend = useMemo(() => new Map(cards.map((c) => [c.id, cardSpend(transactions, c.id)])), [cards, transactions]);
  const totalSpend = [...spend.values()].reduce((a, b) => a + b, 0);
  const totalLimit = cards.filter((c) => !c.frozen).reduce((a, c) => a + c.monthlyLimit, 0);
  const visible = cards.filter((c) => (filter === 'all' ? true : filter === 'frozen' ? c.frozen : c.type === filter));

  const freeze = (c: BankCard) => {
    toggleCardFreeze(c.id);
    toast({
      title: c.frozen ? 'Card unfrozen' : 'Card frozen',
      description: c.frozen ? `${c.nickname} can be used again.` : `New charges on ••${c.last4} will be declined.`,
      tone: c.frozen ? 'success' : 'info',
    });
  };

  return (
    <>
      <PageHeader
        title="Cards"
        description={<>Spent <span className="num font-medium text-ink">{formatMoney(totalSpend)}</span> this month across {cards.length} cards · <span className="num">{formatMoney(totalLimit)}</span> in active limits</>}
        actions={<Button variant="primary" onClick={() => openDialog({ kind: 'card' })}><Plus className="h-4 w-4" aria-hidden />Issue card</Button>}
      />

      <Segmented
        label="Filter cards"
        value={filter}
        onChange={setFilter}
        className="mb-4"
        options={[
          { value: 'all', label: 'All' },
          { value: 'virtual', label: 'Virtual' },
          { value: 'physical', label: 'Physical' },
          { value: 'frozen', label: 'Frozen' },
        ]}
      />

      {visible.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => {
            const spent = spend.get(c.id) ?? 0;
            const ratio = Math.min(1, spent / c.monthlyLimit);
            const near = ratio >= 0.85;
            return (
              <Card key={c.id} className="flex flex-col p-4">
                <CardVisual card={c} />
                <div className="mt-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.nickname}</p>
                    <p className="text-xs text-ink-3">{c.holder} · ••{c.last4}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={c.frozen ? 'primary' : 'secondary'}
                    onClick={() => freeze(c)}
                    aria-pressed={c.frozen}
                  >
                    <Snowflake className="h-3.5 w-3.5" aria-hidden />
                    {c.frozen ? 'Unfreeze' : 'Freeze'}
                  </Button>
                </div>
                <div className="mb-4 mt-4">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-ink-3">Spent this month</span>
                    <span className="num">
                      <span className="font-medium text-ink">{formatMoney(spent)}</span>
                      <span className="text-ink-3"> / {formatMoney(c.monthlyLimit)}</span>
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 rounded-full bg-subtle"
                    role="meter"
                    aria-label={`${c.nickname} spend against limit`}
                    aria-valuemin={0}
                    aria-valuemax={c.monthlyLimit / 100}
                    aria-valuenow={spent / 100}
                  >
                    <div className={cn('h-full rounded-full', near ? 'bg-warn' : 'bg-brand')} style={{ width: `${ratio * 100}%` }} />
                  </div>
                  {near && <p className="mt-1 text-[11px] text-warn">Approaching limit · {formatMoney(Math.max(0, c.monthlyLimit - spent))} left</p>}
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-3.5 w-3.5" aria-hidden />Edit limit</Button>
                  <Link to={`/transactions?card=${c.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                    Transactions <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><EmptyState icon={CreditCard} title="No cards match this filter" /></Card>
      )}

      {editing && <LimitDialog card={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
