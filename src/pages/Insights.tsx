import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { endOfDay, format, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';
import { BarChart3, Table2 } from 'lucide-react';
import { useBank } from '@/store/bank';
import { useBalances } from '@/hooks/useBank';
import { interestEarned, monthlyCashFlow, percentChange, runway, spendingByCategory, topVendors } from '@/lib/analytics';
import { formatMoney } from '@/lib/format';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { StatTile } from '@/components/ui/StatTile';
import { MerchantAvatar } from '@/components/ui/Merchant';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { CategoryBreakdown } from '@/components/charts/CategoryBreakdown';
import { SpendingTrendChart } from '@/components/charts/SpendingTrendChart';

type Period = '30d' | '90d' | '12m';
const PERIODS = [{ value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }, { value: '12m', label: '12 months' }] as const;
const PERIOD_DAYS: Record<Period, number> = { '30d': 30, '90d': 90, '12m': 365 };

export default function Insights() {
  const transactions = useBank((s) => s.transactions);
  const { total } = useBalances();
  const [period, setPeriod] = useState<Period>('90d');
  const [asTable, setAsTable] = useState(false);

  const data = useMemo(() => {
    const now = new Date();
    const end = endOfDay(now);
    const start = startOfDay(subDays(now, PERIOD_DAYS[period] - 1));
    const months = monthlyCashFlow(transactions, 12, now);
    const complete = months.slice(0, -1);
    const lastFull = complete[complete.length - 1];
    const prevFull = complete[complete.length - 2];
    return {
      months,
      categories: spendingByCategory(transactions, start, end),
      vendors: topVendors(transactions, start, end, 8),
      runway: runway(transactions, total.current, now),
      revenueGrowth: percentChange(lastFull.moneyIn, prevFull.moneyIn),
      lastFull,
      avgOut: Math.round(complete.slice(-3).reduce((s, m) => s + m.moneyOut, 0) / 3),
      interest: interestEarned(transactions, startOfMonth(subMonths(now, 11)), end),
    };
  }, [transactions, period, total.current]);

  const top = data.categories[0];

  return (
    <>
      <PageHeader
        title="Insights"
        description="Where your money comes from, where it goes, and how long it lasts."
        actions={<Segmented label="Period" value={period} onChange={setPeriod} options={PERIODS} />}
      />

      <section aria-label="Highlights" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={`Revenue · ${format(new Date(data.lastFull.month), 'MMM')}`}
          value={<span className="num">{formatMoney(data.lastFull.moneyIn, { compact: true })}</span>}
          change={data.revenueGrowth}
          footnote="vs previous month"
        />
        <StatTile label="Avg monthly spend" value={<span className="num">{formatMoney(data.avgOut, { compact: true })}</span>} footnote="Last 3 full months" />
        <StatTile
          label="Largest category"
          value={<span className="truncate">{top?.category ?? '—'}</span>}
          footnote={top ? `${formatMoney(top.amount, { compact: true })} · ${(top.share * 100).toFixed(0)}% of spend` : undefined}
        />
        <StatTile
          label="Interest earned · 12 mo"
          value={<span className="num">{formatMoney(data.interest, { compact: true })}</span>}
          footnote={data.runway.months == null ? 'Cash-flow positive' : `${data.runway.months.toFixed(1)} mo runway`}
        />
      </section>

      <Card className="mt-4">
        <CardHeader
          title="Monthly cash flow"
          description="Last 12 months, excluding internal transfers"
          action={
            <Segmented
              label="Display as"
              value={asTable ? 'table' : 'chart'}
              onChange={(v) => setAsTable(v === 'table')}
              options={[{ value: 'chart', label: 'Chart' }, { value: 'table', label: 'Table' }]}
            />
          }
        />
        <div className="px-3 pb-4 pt-3 sm:px-5">
          {asTable ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-3 [&>th]:py-2 [&>th]:pr-4">
                    <th scope="col">Month</th>
                    <th scope="col" className="text-right">Money in</th>
                    <th scope="col" className="text-right">Money out</th>
                    <th scope="col" className="text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((m) => (
                    <tr key={m.month} className="border-b border-line/60 last:border-0 [&>td]:py-2 [&>td]:pr-4">
                      <td>{format(new Date(m.month), 'MMMM yyyy')}{m.partial && <span className="text-ink-3"> (to date)</span>}</td>
                      <td className="num text-right">{formatMoney(m.moneyIn)}</td>
                      <td className="num text-right">{formatMoney(m.moneyOut)}</td>
                      <td className={`num text-right font-medium ${m.net >= 0 ? 'text-good' : 'text-bad'}`}>{formatMoney(m.net, { sign: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <CashFlowChart data={data.months} height={300} />
          )}
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Spending trend" description="Top categories per month, last 6 months" />
          <div className="px-3 pb-4 pt-3 sm:px-5">
            <SpendingTrendChart transactions={transactions} />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Spending by category" description={PERIODS.find((p) => p.value === period)?.label} />
          <div className="px-5 pb-4 pt-3">
            {data.categories.length ? (
              <CategoryBreakdown data={data.categories} limit={8} range={period === '12m' ? undefined : period} />
            ) : (
              <p className="flex items-center gap-2 py-8 text-sm text-ink-3"><BarChart3 className="h-4 w-4" aria-hidden />No spending in this period.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader title="Top vendors" description={`By total spend · ${PERIODS.find((p) => p.value === period)?.label}`} action={<Table2 className="h-4 w-4 text-ink-3" aria-hidden />} />
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-3 [&>th]:px-3 [&>th]:py-2 [&>th:first-child]:pl-5 [&>th:last-child]:pr-5">
                <th scope="col">Vendor</th>
                <th scope="col" className="hidden sm:table-cell">Category</th>
                <th scope="col" className="text-right">Transactions</th>
                <th scope="col" className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.vendors.map((v) => (
                <tr key={v.name} className="border-b border-line/60 last:border-0 hover:bg-subtle/60 [&>td]:px-3 [&>td]:py-2.5 [&>td:first-child]:pl-5 [&>td:last-child]:pr-5">
                  <td>
                    <Link to={`/transactions?q=${encodeURIComponent(v.name)}`} className="flex items-center gap-3 hover:text-brand">
                      <MerchantAvatar category={v.category} size="sm" />
                      <span className="font-medium">{v.name}</span>
                    </Link>
                  </td>
                  <td className="hidden text-ink-2 sm:table-cell">{v.category}</td>
                  <td className="num text-right text-ink-2">{v.count}</td>
                  <td className="num text-right font-medium">{formatMoney(v.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
