import { useMemo, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, CornerDownLeft, CreditCard, Moon, Search, Send, type LucideIcon } from 'lucide-react';
import { useBank } from '@/store/bank';
import { useUi } from '@/store/ui';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { MerchantAvatar } from '@/components/ui/Merchant';
import { friendlyDate } from '@/components/transactions/TransactionTable';
import type { Category } from '@/lib/types';
import { NAV, SECONDARY_NAV } from './nav';

interface Command {
  id: string;
  group: 'Actions' | 'Pages' | 'Transactions';
  label: string;
  hint?: string;
  icon?: LucideIcon;
  category?: Category;
  run: () => void;
}

export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen);
  const setOpen = useUi((s) => s.setPaletteOpen);
  return open ? createPortal(<Palette onClose={() => setOpen(false)} />, document.body) : null;
}

function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const transactions = useBank((s) => s.transactions);
  const { openDialog, openTxn, setTheme, theme } = useUi();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const go = (to: string) => () => { navigate(to); onClose(); };
    const base: Command[] = [
      { id: 'pay', group: 'Actions', label: 'Send a payment', icon: Send, run: () => openDialog({ kind: 'payment' }) },
      { id: 'transfer', group: 'Actions', label: 'Transfer between accounts', icon: ArrowLeftRight, run: () => openDialog({ kind: 'transfer' }) },
      { id: 'card', group: 'Actions', label: 'Issue a new card', icon: CreditCard, run: () => { navigate('/cards'); openDialog({ kind: 'card' }); } },
      { id: 'theme', group: 'Actions', label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`, icon: Moon, run: () => { setTheme(theme === 'dark' ? 'light' : 'dark'); onClose(); } },
      ...[...NAV, ...SECONDARY_NAV].map((n) => ({ id: n.to, group: 'Pages' as const, label: n.label, icon: n.icon, run: go(n.to) })),
    ];
    const q = query.trim().toLowerCase();
    if (!q) return base;
    const actions = base.filter((c) => c.label.toLowerCase().includes(q));
    const txns = transactions
      .filter((t) => `${t.counterparty} ${t.description} ${t.reference}`.toLowerCase().includes(q))
      .slice(0, 6)
      .map<Command>((t) => ({
        id: t.id,
        group: 'Transactions',
        label: t.counterparty,
        hint: `${friendlyDate(t.date)} · ${formatMoney(t.amount, { sign: true })}`,
        category: t.category,
        run: () => { openTxn(t.id); onClose(); },
      }));
    return [...actions, ...txns];
  }, [query, transactions, navigate, onClose, openDialog, openTxn, setTheme, theme]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, commands.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); commands[active]?.run(); }
    else if (e.key === 'Escape') onClose();
  };

  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="relative w-full max-w-lg animate-slide-up overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="h-4 w-4 text-ink-3" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKey}
            placeholder="Search transactions, pages, actions…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-3"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={commands[active] ? `cmd-${commands[active].id}` : undefined}
          />
          <kbd className="rounded border border-line bg-subtle px-1.5 font-mono text-[10px] text-ink-3">ESC</kbd>
        </div>
        <ul id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5">
          {commands.length === 0 && <li className="px-3 py-8 text-center text-sm text-ink-3">No results for “{query}”</li>}
          {commands.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            const Icon = c.icon;
            return (
              <li key={c.id} role="presentation">
                {header && <p className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-ink-3">{header}</p>}
                <div
                  id={`cmd-${c.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={c.run}
                  className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2', i === active && 'bg-subtle')}
                >
                  {c.category ? <MerchantAvatar category={c.category} size="sm" /> : Icon && <Icon className="h-4 w-4 text-ink-3" aria-hidden />}
                  <span className="flex-1 truncate text-sm">{c.label}</span>
                  {c.hint && <span className="num text-xs text-ink-3">{c.hint}</span>}
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-ink-3" aria-hidden />}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
