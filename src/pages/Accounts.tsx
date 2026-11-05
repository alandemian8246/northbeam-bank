import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { endOfDay, startOfYear } from 'date-fns';
import { ArrowLeft, ArrowLeftRight, ArrowRight, Check, Copy, Eye, EyeOff, Landmark, Send } from 'lucide-react';
import { useBank } from '@/store/bank';
import { COMPANY } from '@/data/generate';
import { useUi } from '@/store/ui';
import { useBalances } from '@/hooks/useBank';
import { balanceHistory, interestEarned } from '@/lib/analytics';
import { formatMoney, maskAccount } from '@/lib/format';
import type { Account } from '@/lib/types';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BigMoney } from '@/components/ui/Money';
import { EmptyState } from '@/components/ui/EmptyState';
import { BalanceChart } from '@/components/charts/BalanceChart';
import { TransactionTable } from '@/components/transactions/TransactionTable';

const KIND_LABEL: Record<Account['kind'], string> = { checking: 'Checking', savings: 'Savings', treasury: 'Treasury · T-bills', credit: 'Credit' };

/** Full account number derived deterministically from last4 for the demo. */
const fullNumber = (a: Account) => `80000${a.routing.slice(-3)}${a.last4}`;

function CopyField({ label, value, masked, mono }: { label: string; value: string; masked?: string; mono?: boolean }) {
  const [revealed, setRevealed] = useState(!masked);
  const [copied, setCopied] = useState(false);
  const toast = useUi((s) => s.toast);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: 'Copy failed', description: 'Clipboard access is blocked in this browser.', tone: 'error' });
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div>
        <p className="text-xs text-ink-3">{label}</p>
        <p className={mono ? 'num font-mono text-sm' : 'text-sm'}>{revealed ? value : masked}</p>
      </div>
      <div className="flex gap-1">
        {masked && (
          <Button size="sm" variant="ghost" onClick={() => setRevealed(!revealed)} aria-label={revealed ? `Hide ${label}` : `Show ${label}`}>
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={copy} aria-label={`Copy ${label}`}>
          {copied ? <Check className="h-3.5 w-3.5 text-good" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export function AccountsList() {
  const accounts = useBank((s) => s.accounts);
  const transactions = useBank((s) => s.transactions);
  const openDialog = useUi((s) => s.openDialog);
  const { byAccount, total } = useBalances();
  const ytdInterest = useMemo(() => {
    const now = new Date();
    return interestEarned(transactions, startOfYear(now), endOfDay(now));
  }, [transactions]);

  return (
    <>
      <PageHeader
        title="Accounts"
        description={<>Total balance <span className="num font-medium text-ink">{formatMoney(total.current)}</span> · <span className="num">{formatMoney(ytdInterest)}</span> interest earned this year</>}
        actions={<Button onClick={() => openDialog({ kind: 'transfer' })}><ArrowLeftRight className="h-4 w-4" aria-hidden />Transfer</Button>}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {accounts.map((a) => {
          const b = byAccount.get(a.id)!;
          const share = total.current ? b.current / total.current : 0;
          return (
            <Link key={a.id} to={`/accounts/${a.id}`} className="group">
              <Card className="h-full p-5 transition-shadow group-hover:shadow-pop">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, var(--${a.color}) 14%, transparent)`, color: `var(--${a.color})` }}>
                      <Landmark className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="font-semibold">{a.name}</p>
                      <p className="text-xs text-ink-3">{KIND_LABEL[a.kind]} {maskAccount(a.last4)}</p>
                    </div>
                  </div>
                  {a.apy ? <Badge tone="good">{(a.apy * 100).toFixed(2)}% APY</Badge> : <Badge>FDIC insured</Badge>}
                </div>
                <BigMoney cents={b.current} className="mt-5 block text-2xl" />
                <p className="mt-1 text-xs text-ink-3">
                  <span className="num">{formatMoney(b.available)}</span> available
                  {b.pendingOut !== 0 && <> · <span className="num">{formatMoney(-b.pendingOut)}</span> pending</>}
                </p>
                <div className="mt-4">
                  <div className="h-1.5 rounded-full bg-subtle">
                    <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: `var(--${a.color})` }} />
                  </div>
                  <p className="mt-1.5 flex items-center justify-between text-xs text-ink-3">
                    <span className="num">{(share * 100).toFixed(1)}% of total cash</span>
                    <span className="inline-flex items-center gap-1 text-brand opacity-0 transition-opacity group-hover:opacity-100">Details <ArrowRight className="h-3 w-3" aria-hidden /></span>
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export function AccountDetail() {
  const { id } = useParams();
  const account = useBank((s) => s.accounts.find((a) => a.id === id));
  const transactions = useBank((s) => s.transactions);
  const openDialog = useUi((s) => s.openDialog);
  const { byAccount } = useBalances();

  const data = useMemo(() => {
    if (!account) return null;
    const now = new Date();
    const own = transactions.filter((t) => t.accountId === account.id);
    const interest = interestEarned(own, startOfYear(now), endOfDay(now));
    // Transfers count here: for a single account they are real inflows and outflows.
    const flows = own.reduce(
      (acc, t) => {
        if (t.status === 'failed' || new Date(t.date) < startOfYear(now)) return acc;
        if (t.amount > 0) acc.in += t.amount;
        else acc.out -= t.amount;
        return acc;
      },
      { in: 0, out: 0 },
    );
    return { own, history: balanceHistory([account], transactions, 90, now), interest, flows };
  }, [account, transactions]);

  if (!account || !data) {
    return (
      <Card>
        <EmptyState icon={Landmark} title="Account not found" description="It may have been closed or the link is wrong." action={<Link to="/accounts"><Button>Back to accounts</Button></Link>} />
      </Card>
    );
  }

  const b = byAccount.get(account.id)!;
  return (
    <>
      <Link to="/accounts" className="mb-3 inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink"><ArrowLeft className="h-3 w-3" aria-hidden />Accounts</Link>
      <PageHeader
        title={account.name}
        description={`${KIND_LABEL[account.kind]} ${maskAccount(account.last4)}${account.apy ? ` · earning ${(account.apy * 100).toFixed(2)}% APY` : ''}`}
        actions={
          <>
            <Button onClick={() => openDialog({ kind: 'transfer' })}><ArrowLeftRight className="h-4 w-4" aria-hidden />Transfer</Button>
            {account.kind === 'checking' && <Button variant="primary" onClick={() => openDialog({ kind: 'payment' })}><Send className="h-4 w-4" aria-hidden />Send</Button>}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap gap-x-10 gap-y-3 px-5 pt-4">
            <div>
              <p className="text-xs text-ink-3">Current balance</p>
              <BigMoney cents={b.current} className="text-3xl" />
            </div>
            <div>
              <p className="text-xs text-ink-3">Available</p>
              <p className="num mt-1.5 text-lg font-medium">{formatMoney(b.available)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-3">{account.apy ? 'Interest YTD' : 'In / out YTD'}</p>
              <p className="num mt-1.5 text-lg font-medium">
                {account.apy ? formatMoney(data.interest) : `${formatMoney(data.flows.in, { compact: true })} / ${formatMoney(data.flows.out, { compact: true })}`}
              </p>
            </div>
          </div>
          <div className="px-3 pb-4 pt-4 sm:px-5">
            <BalanceChart data={data.history.map((p) => ({ ...p, total: p[account.id] as number }))} accounts={[account]} height={220} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Account details" description="Share these to receive ACH and wire payments." />
          <div className="divide-y divide-line/70 px-5 pb-2 pt-1">
            <CopyField label="Account holder" value={COMPANY.name} />
            <CopyField label="Routing number" value={account.routing} mono />
            <CopyField label="Account number" value={fullNumber(account)} masked={`•••• •••• ${account.last4}`} mono />
            <CopyField label="Bank" value="Ledgerline Partner Bank, N.A." />
          </div>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader
          title="Recent transactions"
          action={<Link to={`/transactions?account=${account.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">View all <ArrowRight className="h-3 w-3" aria-hidden /></Link>}
        />
        <div className="mt-2">
          {data.own.length ? <TransactionTable transactions={data.own.slice(0, 10)} compact /> : <EmptyState icon={Landmark} title="No activity yet" />}
        </div>
      </Card>
    </>
  );
}
