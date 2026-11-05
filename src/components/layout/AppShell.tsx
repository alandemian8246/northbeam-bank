import { useCallback, useEffect, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useUi } from '@/store/ui';
import { useHotkey, useSettlementTicker } from '@/hooks/useBank';
import { Toaster } from '@/components/ui/Toaster';
import { TransactionDrawer } from '@/components/transactions/TransactionDrawer';
import { TransferDialog } from '@/components/payments/TransferDialog';
import { PaymentDialog } from '@/components/payments/PaymentDialog';
import { NewCardDialog } from '@/components/payments/NewCardDialog';
import { CommandPalette } from './CommandPalette';
import { MobileNav, Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

function GlobalDialogs() {
  const dialog = useUi((s) => s.dialog);
  const openDialog = useUi((s) => s.openDialog);
  const close = () => openDialog(null);
  return (
    <>
      <TransferDialog open={dialog?.kind === 'transfer'} onClose={close} />
      {/* Keyed by payee so a "Pay again" shortcut always starts from a fresh form. */}
      {dialog?.kind === 'payment' && <PaymentDialog key={dialog.payeeId ?? 'new'} open onClose={close} initialPayeeId={dialog.payeeId} />}
      <NewCardDialog open={dialog?.kind === 'card'} onClose={close} />
      <TransactionDrawer />
      <CommandPalette />
    </>
  );
}

export function AppShell() {
  const setPaletteOpen = useUi((s) => s.setPaletteOpen);
  const { pathname } = useLocation();
  useSettlementTicker();
  useHotkey('k', useCallback(() => setPaletteOpen(!useUi.getState().paletteOpen), [setPaletteOpen]));
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only z-50 rounded bg-brand px-3 py-2 text-brand-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <GlobalDialogs />
      <Toaster />
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
