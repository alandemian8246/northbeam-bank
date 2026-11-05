import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, ChevronDown, Moon, Search, Send, Sun } from 'lucide-react';
import { useUi } from '@/store/ui';
import { Button } from '@/components/ui/Button';
import { Logo } from './Sidebar';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

function MoveMoneyMenu() {
  const openDialog = useUi((s) => s.openDialog);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (kind: 'payment' | 'transfer') => {
    setOpen(false);
    openDialog({ kind });
  };

  return (
    <div ref={ref} className="relative">
      <Button variant="primary" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Move money">
        <Send className="h-4 w-4 sm:hidden" aria-hidden />
        <span className="hidden sm:inline">Move money</span>
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-30 w-64 animate-slide-up rounded-xl border border-line bg-surface p-1.5 shadow-pop">
          <button role="menuitem" onClick={() => choose('payment')} className="flex w-full items-start gap-3 rounded-lg p-2.5 text-left hover:bg-subtle">
            <Send className="mt-0.5 h-4 w-4 text-brand" aria-hidden />
            <span>
              <span className="block text-sm font-medium">Send a payment</span>
              <span className="block text-xs text-ink-3">ACH or wire to anyone in the US</span>
            </span>
          </button>
          <button role="menuitem" onClick={() => choose('transfer')} className="flex w-full items-start gap-3 rounded-lg p-2.5 text-left hover:bg-subtle">
            <ArrowLeftRight className="mt-0.5 h-4 w-4 text-brand" aria-hidden />
            <span>
              <span className="block text-sm font-medium">Transfer between accounts</span>
              <span className="block text-xs text-ink-3">Instant, between your accounts</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export function Topbar() {
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);
  const setPaletteOpen = useUi((s) => s.setPaletteOpen);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <div className="lg:hidden"><Logo /></div>
        <button
          onClick={() => setPaletteOpen(true)}
          className="ml-auto flex h-9 shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink-3 shadow-sm hover:border-ink-3/50 sm:w-72 sm:px-3 lg:ml-0"
          aria-label="Search or jump to"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Search or jump to…</span>
          <kbd className="ml-auto hidden rounded border border-line bg-subtle px-1.5 font-mono text-[10px] sm:inline">{isMac ? '⌘' : 'Ctrl'} K</kbd>
        </button>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <MoveMoneyMenu />
        </div>
      </div>
    </header>
  );
}
