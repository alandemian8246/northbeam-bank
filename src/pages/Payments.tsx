import { useMemo, useState } from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ArrowLeftRight, CalendarClock, Repeat, Send, Users } from 'lucide-react';
import { useBank } from '@/store/bank';
import { useUi } from '@/store/ui';
import { useAccountLookup, useNow } from '@/hooks/useBank';
import { formatMoney, maskAccount } from '@/lib/format';
import { PageHeader } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Segmented } from '@/components/ui/Segmented';
import { Modal } from '@/components/ui/Overlay';
import { EmptyState } from '@/components/ui/EmptyState';
import { TransactionTable } from '@/components/transactions/TransactionTable';

type Tab = 'scheduled' | 'recent' | 'recipients';

export default function Payments() {
  const scheduled = useBank((s) => s.scheduled);
  const payees = useBank((s) => s.payees);
  const transactions = useBank((s) => s.transactions);
  const cancelScheduled = useBank((s) => s.cancelScheduled);
  const openDialog = useUi((s) => s.openDialog);
  const toast = useUi((s) => s.toast);
  const account = useAccountLookup();
  const now = useNow(5000);
  const [tab, setTab] = useState<Tab>('scheduled');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const sortedScheduled = useMemo(() => [...scheduled].sort((a, b) => a.nextDate.localeCompare(b.nextDate)), [scheduled]);
  const outgoing = useMemo(
    () => transactions.filter((t) => (t.method === 'ach' || t.method === 'wire') && t.amount < 0).slice(0, 25),
    [transactions],
  );
  const pending = outgoing.filter((t) => t.status === 'pending');
  const pendingTotal = pending.reduce((s, t) => s - t.amount, 0);
  const next30 = sortedScheduled
    .filter((s) => new Date(s.nextDate).getTime() - now.getTime() < 30 * 86_400_000)
    .reduce((sum, s) => sum + s.amount, 0);
  const toCancel = scheduled.find((s) => s.id === confirmId);

  return (
    <>
      <PageHeader
        title="Payments"
        description="Send ACH and wire payments, manage recurring bills and saved recipients."
        actions={
          <>
            <Button onClick={() => openDialog({ kind: 'transfer' })}><ArrowLeftRight className="h-4 w-4" aria-hidden />Transfer</Button>
            <Button variant="primary" onClick={() => openDialog({ kind: 'payment' })}><Send className="h-4 w-4" aria-hidden />Send payment</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-ink-3">In flight</p>
          <p className="num mt-1 text-xl font-semibold">{formatMoney(pendingTotal)}</p>
          <p className="mt-0.5 text-xs text-ink-3">{pending.length} pending payment{pending.length === 1 ? '' : 's'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-3">Scheduled · next 30 days</p>
          <p className="num mt-1 text-xl font-semibold">{formatMoney(next30)}</p>
          <p className="mt-0.5 text-xs text-ink-3">{scheduled.length} scheduled in total</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-3">Saved recipients</p>
          <p className="num mt-1 text-xl font-semibold">{payees.length}</p>
          <p className="mt-0.5 text-xs text-ink-3">Verified bank details</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <Segmented
            label="Payments view"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'scheduled', label: `Scheduled (${scheduled.length})` },
              { value: 'recent', label: 'Recent' },
              { value: 'recipients', label: 'Recipients' },
            ]}
          />
        </div>

        {tab === 'scheduled' &&
          (sortedScheduled.length ? (
            <ul className="divide-y divide-line/70">
              {sortedScheduled.map((s) => {
                const payee = payees.find((p) => p.id === s.payeeId);
                const date = new Date(s.nextDate);
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg border border-line bg-subtle leading-none">
                      <span className="text-[9px] font-medium uppercase text-ink-3">{format(date, 'MMM')}</span>
                      <span className="text-sm font-semibold">{format(date, 'd')}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{payee?.name ?? 'Unknown recipient'}</p>
                      <p className="truncate text-xs text-ink-3">
                        {s.memo ? `${s.memo} · ` : ''}from {account(s.accountId)?.name} · in {formatDistanceToNowStrict(date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.frequency !== 'once' && <Badge tone="brand"><Repeat className="h-3 w-3" aria-hidden />{s.frequency === 'weekly' ? 'Weekly' : 'Monthly'}</Badge>}
                      <Badge>{s.method.toUpperCase()}</Badge>
                    </div>
                    <span className="num w-28 text-right text-sm font-medium">{formatMoney(s.amount)}</span>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmId(s.id)}>Cancel</Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={CalendarClock} title="No scheduled payments" description="Schedule a payment for a future date or set one to repeat." action={<Button variant="primary" onClick={() => openDialog({ kind: 'payment' })}>Schedule a payment</Button>} />
          ))}

        {tab === 'recent' &&
          (outgoing.length ? <TransactionTable transactions={outgoing} /> : <EmptyState icon={Send} title="No payments yet" />)}

        {tab === 'recipients' &&
          (payees.length ? (
            <ul className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
              {payees.map((p) => (
                <li key={p.id} className="flex items-center gap-3 bg-surface px-5 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                    {p.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-ink-3">{p.bank} {maskAccount(p.last4)} · {p.defaultMethod.toUpperCase()}</p>
                  </div>
                  <Button size="sm" onClick={() => openDialog({ kind: 'payment', payeeId: p.id })}>Pay</Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Users} title="No recipients" />
          ))}
      </Card>

      <Modal
        open={!!toCancel}
        onClose={() => setConfirmId(null)}
        title="Cancel scheduled payment?"
        description="This can’t be undone. You can always schedule it again."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmId(null)}>Keep it</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!toCancel) return;
                cancelScheduled(toCancel.id);
                toast({ title: 'Scheduled payment cancelled', tone: 'info' });
                setConfirmId(null);
              }}
            >
              Cancel payment
            </Button>
          </>
        }
      >
        {toCancel && (
          <p className="text-sm text-ink-2">
            <span className="num font-medium text-ink">{formatMoney(toCancel.amount)}</span> to{' '}
            <span className="font-medium text-ink">{payees.find((p) => p.id === toCancel.payeeId)?.name}</span> on{' '}
            {format(new Date(toCancel.nextDate), 'MMMM d')}
            {toCancel.frequency !== 'once' && ' and all future occurrences'}.
          </p>
        )}
      </Modal>
    </>
  );
}
