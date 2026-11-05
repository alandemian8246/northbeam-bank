import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { ArrowLeftRight, ArrowRight, CalendarClock, Send } from 'lucide-react';
import { useBank } from '@/store/bank';
import { useUi } from '@/store/ui';
import { useBalances } from '@/hooks/useBank';
import { balanceHistory, cashFlow, monthlyCashFlow, percentChange, runway, spendingByCategory } from '@/lib/analytics';
import { formatMoney, maskAccount } from '@/lib/format';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { StatTile } from '@/components/ui/StatTile';
import { BigMoney } from '@/components/ui/Money';
import { Badge } from '@/components/ui/Badge';
import { BalanceChart } from '@/components/charts/BalanceChart';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { CategoryBreakdown } from '@/components/charts/CategoryBreakdown';
import { TransactionTable } from '@/components/transactions/TransactionTable';

type Range = '30' | '90' | '365';
const RANGES = [{ value: '30', label: '30D' }, { value: '90', label: '90D' }, { value: '365', label: '1Y' }] as const;

function greeting(now: Date) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Overview() {
  const accounts = useBank((s) => s.accounts);
  const transactions = useBank((s) => s.transactions);
  const scheduled = useBank((s) => s.scheduled);
  const payees = useBank((s) => s.payees);
  const openDialog = useUi((s) => s.openDialog);
  const navigate = useNavigate();
  const { total, byAccount } = useBalances();
  const [range, setRange] = useState<Range>('90');
  const [split, setSplit] = useState<'total' | 'accounts'>('total');

  const now = useMemo(() => new Date(), []);
  const stats = useMemo(() => {
    // Windows close at end of day so activity created after page load still counts.
    const end = endOfDay(now);
    const start = startOfDay(subDays(now, 29));
    const prevStart = startOfDay(subDays(now, 59));
    const cur = cashFlow(transactions, start, end);
    const prev = cashFlow(transactions, prevStart, start);
    return {
      cur,
      inChange: percentChange(cur.moneyIn, prev.moneyIn),
      outChange: percentChange(cur.moneyOut, prev.moneyOut),
      runway: runway(transactions, total.current, now),
      categories: spendingByCategory(transactions, start, end),
    };
  }, [transactions, total.current, now]);

  const history = useMemo(() => balanceHistory(accounts, transactions, Number(range), now), [accounts, transactions, range, now]);
  const flows = useMemo(() => monthlyCashFlow(transactions, 6, now), [transactions, now]);
  const rangeChange = percentChange(history[history.length - 1].total, history[0].total);
  const upcoming = [...scheduled].sort((a, b) => a.nextDate.localeCompare(b.nextDate)).slice(0, 4);

  return (
    <>
      <PageHeader
        title={`${greeting(now)}, Maya`}
        description={format(now, 'EEEE, MMMM d')}
        actions={
          <>
            <Button onClick={() => openDialog({ kind: 'transfer' })}><ArrowLeftRight className="h-4 w-4" aria-hidden />Transfer</Button>
            <Button variant="primary" onClick={() => openDialog({ kind: 'payment' })}><Send className="h-4 w-4" aria-hidden />Send</Button>
          </>
        }
      />

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Total cash"
          value={<BigMoney cents={total.current} />}
          footnote={total.pendingOut ? `${formatMoney(-total.pendingOut)} pending out` : `Across ${accounts.length} accounts`}
        />
        <StatTile label="Money in · 30d" value={<span className="num">{formatMoney(stats.cur.moneyIn, { compact: true })}</span>} change={stats.inChange} footnote="vs prior 30d" />
        <StatTile label="Money out · 30d" value={<span className="num">{formatMoney(stats.cur.moneyOut, { compact: true })}</span>} change={stats.outChange} positiveIsGood={false} footnote="vs prior 30d" />
        <StatTile
          label={stats.runway.months == null ? 'Net cash flow' : 'Runway'}
          value={
            stats.runway.months == null ? (
              <span className="num text-good">+{formatMoney(-stats.runway.avgBurn, { compact: true })}<span className="text-sm font-medium text-ink-3">/mo</span></span>
            ) : (
              <span className="num">{stats.runway.months > 99 ? '99+' : stats.runway.months.toFixed(1)}<span className="text-sm font-medium text-ink-3"> months</span></span>
            )
          }
          footnote={stats.runway.months == null ? 'Cash-flow positive · 3-mo avg' : `${formatMoney(stats.runway.avgBurn, { compact: true })}/mo net burn`}
        />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Cash balance"
            description={
              rangeChange != null ? (
                <span>
                  <span className={rangeChange >= 0 ? 'text-good' : 'text-bad'}>{rangeChange >= 0 ? '▲' : '▼'} {Math.abs(rangeChange * 100).toFixed(1)}%</span>{' '}
                  over the last {range === '365' ? 'year' : `${range} days`}
                </span>
              ) : undefined
            }
            action={
              <div className="flex flex-wrap gap-2">
                <Segmented label="Series" value={split} onChange={setSplit} options={[{ value: 'total', label: 'Total' }, { value: 'accounts', label: 'By account' }]} />
                <Segmented label="Time range" value={range} onChange={setRange} options={RANGES} />
              </div>
            }
          />
          <div className="px-3 pb-4 pt-3 sm:px-5">
            <BalanceChart data={history} accounts={accounts} byAccount={split === 'accounts'} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Accounts" action={<Link to="/accounts" className="text-xs font-medium text-brand hover:underline">View all</Link>} />
          <ul className="mt-2 px-2 pb-2">
            {accounts.map((a) => {
              const b = byAccount.get(a.id)!;
              return (
                <li key={a.id}>
                  <Link to={`/accounts/${a.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-subtle">
                    <span className="h-8 w-1 rounded-full" style={{ background: `var(--${a.color})` }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        {a.name}
                        {a.apy && <Badge tone="good">{(a.apy * 100).toFixed(2)}% APY</Badge>}
                      </p>
                      <p className="text-xs text-ink-3">{a.kind === 'treasury' ? 'Treasury' : a.kind === 'savings' ? 'Savings' : 'Checking'} {maskAccount(a.last4)}</p>
                    </div>
                    <span className="num text-sm font-medium">{formatMoney(b.current)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mx-5 flex justify-between border-t border-line py-3 text-sm">
            <span className="text-ink-3">Available now</span>
            <span className="num font-semibold">{formatMoney(total.available)}</span>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Cash flow" description="Money in vs. out, excluding internal transfers. Click a month to see its transactions." />
          <div className="px-3 pb-4 pt-3 sm:px-5">
            <CashFlowChart
              data={flows}
              onSelect={(m) => {
                const d = new Date(m.month);
                const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                navigate(`/transactions?range=custom&from=${format(d, 'yyyy-MM-dd')}&to=${format(to, 'yyyy-MM-dd')}`);
              }}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Spending by category" description="Last 30 days" action={<Link to="/insights" className="text-xs font-medium text-brand hover:underline">Insights</Link>} />
          <div className="px-5 pb-4 pt-3">
            <CategoryBreakdown data={stats.categories} range="30d" />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader
            title="Recent activity"
            action={<Link to="/transactions" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">All transactions <ArrowRight className="h-3 w-3" aria-hidden /></Link>}
          />
          <div className="mt-2">
            <TransactionTable transactions={transactions.slice(0, 8)} compact />
          </div>
        </Card>
        <Card>
          <CardHeader title="Upcoming payments" action={<Link to="/payments" className="text-xs font-medium text-brand hover:underline">Manage</Link>} />
          {upcoming.length ? (
            <ul className="mt-2 px-2 pb-3">
              {upcoming.map((s) => {
                const payee = payees.find((p) => p.id === s.payeeId);
                return (
                  <li key={s.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                    <div className="flex h-9 w-9 flex-col items-center justify-center rounded-lg border border-line bg-subtle leading-none">
                      <span className="text-[9px] font-medium uppercase text-ink-3">{format(new Date(s.nextDate), 'MMM')}</span>
                      <span className="text-sm font-semibold">{format(new Date(s.nextDate), 'd')}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{payee?.name}</p>
                      <p className="text-xs capitalize text-ink-3">{s.method.toUpperCase()} · {s.frequency === 'once' ? 'one time' : s.frequency}</p>
                    </div>
                    <span className="num text-sm font-medium">{formatMoney(s.amount)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="flex items-center gap-2 px-5 py-6 text-sm text-ink-3"><CalendarClock className="h-4 w-4" aria-hidden />Nothing scheduled.</p>
          )}
        </Card>
      </div>
    </>
  );
}
