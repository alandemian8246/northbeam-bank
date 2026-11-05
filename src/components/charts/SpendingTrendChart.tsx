import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, startOfMonth, subMonths } from 'date-fns';
import { spendingByCategory } from '@/lib/analytics';
import type { Category, Transaction } from '@/lib/types';
import { axisProps, compactMoney, Legend, TooltipCard } from './ChartTooltip';

const TOP_N = 5;
// Fixed categorical order; "Other" is a neutral so it never competes with named series.
const SLOTS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)'];
const OTHER = 'var(--chart-axis)';

/** Stacked monthly spend for the largest categories, with everything else folded into "Other". */
export function SpendingTrendChart({ transactions, months = 6, height = 280 }: { transactions: Transaction[]; months?: number; height?: number }) {
  const { rows, series } = useMemo(() => {
    const now = new Date();
    const from = startOfMonth(subMonths(now, months - 1));
    // Rank once over the whole window so a category keeps its color in every month.
    const top = spendingByCategory(transactions, from, now).slice(0, TOP_N).map((c) => c.category);
    const rows = Array.from({ length: months }, (_, i) => {
      const start = startOfMonth(subMonths(now, months - 1 - i));
      const end = startOfMonth(subMonths(now, months - 2 - i));
      const row: Record<string, number | string> = { label: format(start, 'MMM'), month: format(start, 'MMMM yyyy') };
      let other = 0;
      for (const c of spendingByCategory(transactions, start, end)) {
        if (top.includes(c.category)) row[c.category] = c.amount;
        else other += c.amount;
      }
      row.Other = other;
      return row;
    });
    const series: Array<{ key: Category | 'Other'; color: string }> = [
      ...top.map((key, i) => ({ key, color: SLOTS[i] })),
      { key: 'Other', color: OTHER },
    ];
    return { rows, series };
  }, [transactions, months]);

  return (
    <div>
      <div className="mb-3">
        <Legend items={series.map((s) => ({ label: s.key, color: s.color }))} />
      </div>
      <div style={{ height }} role="img" aria-label="Monthly spending by category">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} width={56} tickFormatter={compactMoney} />
            <Tooltip
              cursor={{ fill: 'var(--chart-grid)', opacity: 0.6 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as Record<string, number | string>;
                const items = series.map((s) => ({ label: s.key, value: (row[s.key] as number) ?? 0, color: s.color })).reverse();
                const total = items.reduce((sum, i) => sum + i.value, 0);
                return <TooltipCard title={row.month as string} rows={[...items, { label: 'Total', value: total, emphasis: true }]} />;
              }}
            />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId="spend"
                fill={s.color}
                stroke="rgb(var(--surface))"
                strokeWidth={1}
                radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
                maxBarSize={40}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
