import { useState, type ReactNode } from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Check, Copy, FileText, Paperclip, Trash2, Upload } from 'lucide-react';
import { EDITABLE_CATEGORIES, useBank } from '@/store/bank';
import { useUi } from '@/store/ui';
import { useAccountLookup, useNow } from '@/hooks/useBank';
import { Drawer } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Amount } from '@/components/ui/Money';
import { MerchantAvatar } from '@/components/ui/Merchant';
import { maskAccount } from '@/lib/format';
import type { Category, Transaction } from '@/lib/types';

const METHOD_LABEL: Record<Transaction['method'], string> = {
  ach: 'ACH', wire: 'Domestic wire', card: 'Card', transfer: 'Internal transfer', check: 'Check', interest: 'Interest credit',
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}

export function TransactionDrawer() {
  const txnId = useUi((s) => s.txnId);
  const openTxn = useUi((s) => s.openTxn);
  const txn = useBank((s) => s.transactions.find((t) => t.id === txnId));
  // Keyed so local draft state (note, copied) resets when another transaction opens.
  return txn ? <Details key={txn.id} txn={txn} onClose={() => openTxn(null)} /> : null;
}

function Details({ txn, onClose }: { txn: Transaction; onClose: () => void }) {
  const toast = useUi((s) => s.toast);
  const counterpart = useBank((s) =>
    txn.transferGroup ? s.transactions.find((t) => t.transferGroup === txn.transferGroup && t.id !== txn.id) : undefined,
  );
  const cards = useBank((s) => s.cards);
  const update = useBank((s) => s.updateTransaction);
  const account = useAccountLookup();
  const now = useNow();
  const [note, setNote] = useState(txn.note ?? '');
  const [copied, setCopied] = useState(false);

  const acct = account(txn.accountId);
  const card = cards.find((c) => c.id === txn.cardId);
  const editable = txn.category !== 'Transfer' && txn.category !== 'Interest';

  const saveNote = () => {
    if ((txn.note ?? '') === note.trim()) return;
    update(txn.id, { note: note.trim() || undefined });
    toast({ title: 'Note saved' });
  };

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(txn.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: 'Copy failed', description: 'Clipboard access is blocked in this browser.', tone: 'error' });
    }
  };

  return (
    <Drawer open onClose={onClose} title="Transaction details" description={format(new Date(txn.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}>
      <div className="flex flex-col items-center border-b border-line pb-5 text-center">
        <MerchantAvatar category={txn.category} />
        <p className="mt-3 text-sm font-medium">{txn.counterparty}</p>
        <Amount cents={txn.amount} muted={txn.status === 'failed'} className="mt-1 text-3xl font-semibold tracking-tight" />
        <div className="mt-2"><StatusBadge status={txn.status} /></div>
        {txn.status === 'pending' && txn.settlesAt && (
          <p className="mt-2 text-xs text-ink-3">
            {new Date(txn.settlesAt) > now
              ? `Expected to settle in ${formatDistanceToNowStrict(new Date(txn.settlesAt))}`
              : 'Settling now…'}
          </p>
        )}
        {txn.status === 'failed' && <p className="mt-2 text-xs text-ink-3">Declined by the card network. No funds moved.</p>}
      </div>

      <dl className="divide-y divide-line/70 text-sm">
        <Row label="Description">{txn.description}</Row>
        <Row label="Account">{acct ? `${acct.name} ${maskAccount(acct.last4)}` : '—'}</Row>
        <Row label="Method">{METHOD_LABEL[txn.method]}</Row>
        {card && <Row label="Card">{card.nickname} {maskAccount(card.last4)}<br /><span className="text-xs text-ink-3">{card.holder}</span></Row>}
        {counterpart && <Row label="Counterpart">{account(counterpart.accountId)?.name} <Amount cents={counterpart.amount} className="ml-1 text-xs" /></Row>}
        <Row label="Reference">
          <button onClick={copyRef} className="inline-flex items-center gap-1.5 font-mono text-xs hover:text-brand" aria-label="Copy reference">
            {txn.reference}
            {copied ? <Check className="h-3.5 w-3.5 text-good" /> : <Copy className="h-3.5 w-3.5 text-ink-3" />}
          </button>
        </Row>
        <div className="py-2.5">
          <label htmlFor="txn-category" className="label">Category</label>
          {editable ? (
            <select
              id="txn-category"
              className="field"
              value={txn.category}
              onChange={(e) => {
                update(txn.id, { category: e.target.value as Category });
                toast({ title: 'Category updated', description: `Moved to ${e.target.value}.` });
              }}
            >
              {EDITABLE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          ) : (
            <p id="txn-category" className="text-ink">{txn.category}</p>
          )}
        </div>
      </dl>

      <div className="mt-2">
        <label htmlFor="txn-note" className="label">Note</label>
        <textarea
          id="txn-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          placeholder="Add context for your accountant…"
          className="field h-auto resize-none py-2"
        />
      </div>

      {txn.amount < 0 && txn.status !== 'failed' && (
        <div className="mt-4">
          <p className="label">Receipt</p>
          {txn.hasReceipt ? (
            <div className="flex items-center gap-3 rounded-lg border border-line p-3">
              <FileText className="h-5 w-5 text-ink-3" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">receipt-{txn.reference.toLowerCase()}.pdf</p>
                <p className="text-xs text-ink-3">Matched automatically</p>
              </div>
              <Button size="sm" variant="ghost" aria-label="Remove receipt" onClick={() => update(txn.id, { hasReceipt: false })}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-line p-4 text-center hover:border-brand hover:bg-brand-soft/40">
              <Upload className="h-4 w-4 text-ink-3" aria-hidden />
              <span className="text-sm">Upload receipt</span>
              <span className="text-xs text-ink-3">PDF, PNG or JPG</span>
              <input
                type="file"
                accept=".pdf,image/*"
                className="sr-only"
                onChange={(e) => {
                  if (!e.target.files?.length) return;
                  update(txn.id, { hasReceipt: true });
                  toast({ title: 'Receipt attached', description: e.target.files[0].name });
                }}
              />
            </label>
          )}
        </div>
      )}

      {txn.hasReceipt && txn.amount < 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-3"><Paperclip className="h-3 w-3" aria-hidden />Receipts sync to your accounting integration nightly.</p>
      )}
    </Drawer>
  );
}
