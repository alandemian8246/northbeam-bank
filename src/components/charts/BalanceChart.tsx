import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BalancePoint } from '@/lib/analytics';
import type { Account } from '@/lib/types';
import { axisProps, compactMoney, Legend, TooltipCard } from './ChartTooltip';

interface Props {
  data: BalancePoint[];
  accounts: Account[];
  /** Stack per-account areas instead of one total line. */
  byAccount?: boolean;
  height?: number;
}

const color = (a: Account) => `var(--${a.color})`;

export function BalanceChart({ data, accounts, byAccount = false, height = 260 }: Props) {
  const tickEvery = Math.max(1, Math.floor(data.length / 6));
  const domain = useMemo(() => {
    if (byAccount) return [0, 'auto'] as const;
    const values = data.map((d) => d.total);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.15 || max * 0.05;
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)] as const;
  }, [data, byAccount]);

  return (
    <div>
      {byAccount && (
        <div className="mb-3">
          <Legend items={accounts.map((a) => ({ label: a.name, color: color(a) }))} />
        </div>
      )}
      <div style={{ height }} role="img" aria-label={byAccount ? 'Balance by account over time' : 'Total cash balance over time'}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" {...axisProps} interval={tickEvery - 1} minTickGap={16} />
            <YAxis {...axisProps} width={56} tickFormatter={compactMoney} domain={domain as [number, number]} />
            <Tooltip
              cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as BalancePoint;
                const rows = byAccount
                  ? accounts.map((a) => ({ label: a.name, value: point[a.id] as number, color: color(a) }))
                  : [];
                return (
                  <TooltipCard
                    title={point.label}
                    rows={[...rows, { label: 'Total cash', value: point.total, emphasis: true, color: byAccount ? undefined : 'var(--series-1)' }]}
                  />
                );
              }}
            />
            {byAccount ? (
              accounts.map((a) => (
                <Area
                  key={a.id}
                  dataKey={a.id}
                  stackId="1"
                  type="monotone"
                  stroke={color(a)}
                  strokeWidth={2}
                  fill={color(a)}
                  fillOpacity={0.18}
                  isAnimationActive={false}
                />
              ))
            ) : (
              <Area
                dataKey="total"
                type="monotone"
                stroke="var(--series-1)"
                strokeWidth={2}
                fill="url(#balanceFill)"
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgb(var(--surface))' }}
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
