import { useMemo, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Clock3, Plus } from 'lucide-react';
import { BankError, SETTLEMENT_MS, useBank } from '@/store/bank';
import { useUi } from '@/store/ui';
import { useBalances } from '@/hooks/useBank';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { formatMoney, maskAccount, parseMoney } from '@/lib/format';
import type { Frequency } from '@/lib/types';
import { AmountInput } from './AmountInput';

type Step = 'form' | 'review' | 'done';
const todayIso = () => format(new Date(), 'yyyy-MM-dd');
const FREQUENCY_LABEL: Record<Frequency, string> = { once: 'One time', weekly: 'Every week', monthly: 'Every month' };

export function PaymentDialog({ open, onClose, initialPayeeId }: { open: boolean; onClose: () => void; initialPayeeId?: string }) {
  const allAccounts = useBank((s) => s.accounts);
  const accounts = useMemo(() => allAccounts.filter((a) => a.kind === 'checking'), [allAccounts]);
  const payees = useBank((s) => s.payees);
  const sendPayment = useBank((s) => s.sendPayment);
  const addPayee = useBank((s) => s.addPayee);
  const toast = useUi((s) => s.toast);
  const { byAccount } = useBalances();

  const [step, setStep] = useState<Step>('form');
  const [accountId, setAccountId] = useState('acc_ops');
  const [payeeId, setPayeeId] = useState(initialPayeeId ?? payees[0]?.id ?? '');
  const [newPayee, setNewPayee] = useState(false);
  const [payeeName, setPayeeName] = useState('');
  const [payeeAccount, setPayeeAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'ach' | 'wire'>('ach');
  const [date, setDate] = useState(todayIso());
  const [frequency, setFrequency] = useState<Frequency>('once');
  const [memo, setMemo] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<'sent' | 'scheduled'>('sent');

  const cents = parseMoney(amount) ?? 0;
  const available = byAccount.get(accountId)?.available ?? 0;
  const payee = payees.find((p) => p.id === payeeId);
  const account = accounts.find((a) => a.id === accountId);
  const isFuture = date > todayIso();

  const close = () => {
    setStep('form');
    setAmount('');
    setMemo('');
    setErrors({});
    setNewPayee(false);
    setPayeeName('');
    setPayeeAccount('');
    setDate(todayIso());
    setFrequency('once');
    onClose();
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (newPayee) {
      if (payeeName.trim().length < 2) e.payeeName = 'Enter the recipient’s legal name.';
      if (!/^\d{6,17}$/.test(payeeAccount)) e.payeeAccount = 'Account numbers are 6–17 digits.';
    } else if (!payee) e.payee = 'Choose a recipient.';
    if (!cents) e.amount = 'Enter an amount greater than $0.';
    else if (!isFuture && cents > available) e.amount = `Exceeds the ${formatMoney(available)} available in ${account?.name}.`;
    if (!date || date < todayIso()) e.date = 'Choose today or a future date.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const review = (e: FormEvent) => {
    e.preventDefault();
    if (validate()) setStep('review');
  };

  const confirm = () => {
    try {
      let id = payeeId;
      if (newPayee) {
        id = addPayee({ name: payeeName.trim(), bank: 'External bank', last4: payeeAccount.slice(-4), defaultMethod: method, category: 'Professional Services' }).id;
        setPayeeId(id);
        setNewPayee(false);
      }
      const res = sendPayment({ accountId, payeeId: id, amount: cents, method, date, frequency, memo });
      setResult(res.kind);
      setStep('done');
      toast({
        title: res.kind === 'sent' ? 'Payment sent' : 'Payment scheduled',
        description: `${formatMoney(cents)} to ${newPayee ? payeeName : payee?.name}`,
      });
    } catch (err) {
      setErrors({ amount: err instanceof BankError ? err.message : 'Something went wrong.' });
      setStep('form');
    }
  };

  const recipientName = newPayee ? payeeName : payee?.name;
  const settleSeconds = SETTLEMENT_MS[method] / 1000;

  return (
    <Modal
      open={open}
      onClose={close}
      title={step === 'done' ? (result === 'sent' ? 'Payment on its way' : 'Payment scheduled') : step === 'review' ? 'Review payment' : 'Send a payment'}
      description={step === 'form' ? 'Pay a vendor, contractor or anyone with a US bank account.' : undefined}
      footer={
        step === 'form' ? (
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button variant="primary" type="submit" form="payment-form">Review</Button>
          </>
        ) : step === 'review' ? (
          <>
            <Button variant="ghost" onClick={() => setStep('form')}>Back</Button>
            <Button variant="primary" onClick={confirm} data-autofocus>
              {isFuture ? 'Schedule' : 'Send'} {formatMoney(cents)}
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={close}>Done</Button>
        )
      }
    >
      {step === 'form' && (
        <form id="payment-form" onSubmit={review} className="space-y-4" noValidate>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="pay-to" className="label mb-0">Recipient</label>
              <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline" onClick={() => setNewPayee(!newPayee)}>
                {newPayee ? 'Choose saved recipient' : <><Plus className="h-3 w-3" aria-hidden />New recipient</>}
              </button>
            </div>
            {newPayee ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <input id="pay-to" className="field" placeholder="Legal name" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} aria-invalid={!!errors.payeeName} aria-label="Recipient legal name" />
                  {errors.payeeName && <p className="mt-1 text-xs text-bad">{errors.payeeName}</p>}
                </div>
                <div>
                  <input className="field num" inputMode="numeric" placeholder="Account number" value={payeeAccount} onChange={(e) => setPayeeAccount(e.target.value.replace(/\D/g, ''))} aria-invalid={!!errors.payeeAccount} aria-label="Recipient account number" />
                  {errors.payeeAccount && <p className="mt-1 text-xs text-bad">{errors.payeeAccount}</p>}
                </div>
              </div>
            ) : (
              <>
                <select
                  id="pay-to"
                  className="field"
                  value={payeeId}
                  onChange={(e) => {
                    setPayeeId(e.target.value);
                    const p = payees.find((x) => x.id === e.target.value);
                    if (p) setMethod(p.defaultMethod);
                  }}
                >
                  {payees.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.bank} {maskAccount(p.last4)}</option>)}
                </select>
                {errors.payee && <p className="mt-1 text-xs text-bad">{errors.payee}</p>}
              </>
            )}
          </div>

          <div>
            <label htmlFor="pay-from" className="label">Pay from</label>
            <select id="pay-from" className="field" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} {maskAccount(a.last4)} · {formatMoney(byAccount.get(a.id)?.available ?? 0)} available</option>
              ))}
            </select>
          </div>

          <AmountInput label="Amount" value={amount} onChange={(v) => { setAmount(v); setErrors((e) => ({ ...e, amount: '' })); }} error={errors.amount || undefined} autoFocus />

          <div>
            <p className="label">Payment method</p>
            <Segmented
              label="Payment method"
              value={method}
              onChange={setMethod}
              options={[{ value: 'ach', label: 'ACH · 1–3 days · Free' }, { value: 'wire', label: 'Wire · Same day · Free' }]}
              className="w-full [&>button]:flex-1"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="pay-date" className="label">Send on</label>
              <input id="pay-date" type="date" className="field" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.date} />
              {errors.date && <p className="mt-1 text-xs text-bad">{errors.date}</p>}
            </div>
            <div>
              <label htmlFor="pay-freq" className="label">Repeat</label>
              <select id="pay-freq" className="field" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
                {Object.entries(FREQUENCY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="pay-memo" className="label">Memo <span className="font-normal text-ink-3">(shown to recipient)</span></label>
            <input id="pay-memo" className="field" maxLength={80} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Invoice #, purpose…" />
          </div>
        </form>
      )}

      {step === 'review' && (
        <div>
          <div className="rounded-xl bg-subtle p-4 text-center">
            <p className="text-xs text-ink-3">You’re sending</p>
            <p className="num mt-1 text-3xl font-semibold tracking-tight">{formatMoney(cents)}</p>
            <p className="mt-1 text-sm text-ink-2">to {recipientName}</p>
          </div>
          <dl className="mt-4 divide-y divide-line/70 text-sm">
            {[
              ['From', `${account?.name} ${maskAccount(account?.last4 ?? '')}`],
              ['Method', method === 'ach' ? 'ACH transfer' : 'Domestic wire'],
              ['Date', isFuture ? format(new Date(`${date}T00:00:00`), 'EEE, MMM d, yyyy') : 'Today'],
              ['Repeats', FREQUENCY_LABEL[frequency]],
              ['Fee', 'Free'],
              ...(memo ? [['Memo', memo]] : []),
              ...(!isFuture ? [['Balance after', formatMoney(available - cents)]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="text-ink-3">{k}</dt>
                <dd className="num text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {step === 'done' && (
        <div className="py-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-good-soft text-good">
            {result === 'sent' ? <CheckCircle2 className="h-6 w-6" aria-hidden /> : <Clock3 className="h-6 w-6" aria-hidden />}
          </div>
          <p className="num text-2xl font-semibold">{formatMoney(cents)}</p>
          <p className="mt-1 text-sm text-ink-2">
            {result === 'sent'
              ? `is pending to ${recipientName}. It will post automatically (demo: about ${settleSeconds}s).`
              : `will be sent to ${recipientName} on ${format(new Date(`${date}T00:00:00`), 'MMM d')}.`}
          </p>
          {frequency !== 'once' && <p className="mt-2 text-xs text-ink-3">Repeats {FREQUENCY_LABEL[frequency].toLowerCase()} — manage it under Payments.</p>}
        </div>
      )}
    </Modal>
  );
}
