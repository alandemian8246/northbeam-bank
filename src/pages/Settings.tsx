import { useState } from 'react';
import { Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import { useBank } from '@/store/bank';
import { useUi, type Theme } from '@/store/ui';
import { COMPANY } from '@/data/generate';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { cn } from '@/lib/cn';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

export default function Settings() {
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);
  const toast = useUi((s) => s.toast);
  const reset = useBank((s) => s.reset);
  const txnCount = useBank((s) => s.transactions.length);
  const [confirm, setConfirm] = useState(false);

  const followSystem = () => setTheme(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const options: Array<{ value: Theme | 'system'; label: string; icon: typeof Sun }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'Match system', icon: Monitor },
  ];

  return (
    <>
      <PageHeader title="Settings" description="Company profile, appearance and demo controls." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Company" />
          <dl className="divide-y divide-line/70 px-5 pb-3 pt-1">
            <Field label="Legal name" value={COMPANY.name} />
            <Field label="EIN" value={COMPANY.ein} />
            <Field label="Entity type" value="Delaware C-Corp" />
            <Field label="Primary admin" value="Maya Chen" />
            <Field label="Plan" value="Ledgerline Growth" />
          </dl>
        </Card>

        <Card>
          <CardHeader title="Appearance" description="Applies to this browser." />
          <div className="grid grid-cols-3 gap-2 px-5 pb-5 pt-3" role="radiogroup" aria-label="Theme">
            {options.map(({ value, label, icon: Icon }) => {
              const active = value === theme;
              return (
                <button
                  key={value}
                  role="radio"
                  aria-checked={active}
                  onClick={() => (value === 'system' ? followSystem() : setTheme(value))}
                  className={cn('flex flex-col items-center gap-2 rounded-xl border p-4 text-xs transition-colors', active ? 'border-brand bg-brand-soft text-brand' : 'border-line hover:bg-subtle')}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Demo data"
            description={`This is a demo: ${txnCount.toLocaleString()} sample transactions are generated locally and saved in your browser. Nothing leaves your device.`}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5 pt-3">
            <p className="max-w-xl text-sm text-ink-2">
              Resetting regenerates twelve months of activity ending today and discards payments, transfers, notes and card changes you made.
            </p>
            <Button variant="danger" onClick={() => setConfirm(true)}><RotateCcw className="h-4 w-4" aria-hidden />Reset demo data</Button>
          </div>
        </Card>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset demo data?"
        description="All of your changes in this browser will be replaced with fresh sample data."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { reset(); setConfirm(false); toast({ title: 'Demo data reset' }); }}>Reset</Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">This can’t be undone.</p>
      </Modal>
    </>
  );
}
