import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import type { MonthlyFlow } from '@/lib/analytics';
import { formatMoney } from '@/lib/format';
import { axisProps, compactMoney, Legend, TooltipCard } from './ChartTooltip';

const IN = 'var(--series-1)';
const OUT = 'var(--series-2)';

/** Money in vs. money out per month on one shared axis; net appears in the tooltip. */
export function CashFlowChart({ data, height = 260, onSelect }: { data: MonthlyFlow[]; height?: number; onSelect?: (m: MonthlyFlow) => void }) {
  return (
    <div>
      <div className="mb-3">
        <Legend items={[{ label: 'Money in', color: IN }, { label: 'Money out', color: OUT }]} />
      </div>
      <div style={{ height }} role="img" aria-label="Monthly money in versus money out">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            barGap={2}
            barCategoryGap="22%"
            onClick={(e) => {
              const idx = e?.activeTooltipIndex;
              if (onSelect && typeof idx === 'number') onSelect(data[idx]);
            }}
          >
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} width={56} tickFormatter={compactMoney} />
            <ReferenceLine y={0} stroke="var(--chart-axis)" strokeOpacity={0.5} />
            <Tooltip
              cursor={{ fill: 'var(--chart-grid)', opacity: 0.6 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const m = payload[0].payload as MonthlyFlow;
                return (
                  <TooltipCard
                    title={`${format(new Date(m.month), 'MMMM yyyy')}${m.partial ? ' (to date)' : ''}`}
                    rows={[
                      { label: 'Money in', value: m.moneyIn, color: IN },
                      { label: 'Money out', value: m.moneyOut, color: OUT },
                    ]}
                    footer={
                      <span className="flex justify-between gap-4">
                        <span>Net</span>
                        <span className="num font-semibold text-ink">{formatMoney(m.net, { sign: true })}</span>
                      </span>
                    }
                  />
                );
              }}
            />
            {(['moneyIn', 'moneyOut'] as const).map((key) => (
              <Bar key={key} dataKey={key} fill={key === 'moneyIn' ? IN : OUT} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} className={onSelect ? 'cursor-pointer' : undefined}>
                {/* The current month is still in progress: fade it so it doesn't read as a collapse. */}
                {data.map((m) => <Cell key={m.month} fillOpacity={m.partial ? 0.45 : 1} />)}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
