import { NavLink } from 'react-router-dom';
import { COMPANY } from '@/data/generate';
import { useBalances } from '@/hooks/useBank';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { NAV, SECONDARY_NAV, type NavItem } from './nav';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <img src="/favicon.svg" alt="" className="h-7 w-7" />
      <span className="text-[15px] font-semibold tracking-tight">Ledgerline</span>
    </div>
  );
}

function Item({ to, label, icon: Icon }: NavItem) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
          isActive ? 'bg-surface font-medium text-ink shadow-card ring-1 ring-line' : 'text-ink-2 hover:bg-subtle hover:text-ink',
        )
      }
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </NavLink>
  );
}

export function Sidebar() {
  const { total } = useBalances();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-canvas px-3 py-4 lg:flex">
      <div className="px-2.5"><Logo /></div>

      <div className="mx-1 mt-5 rounded-lg border border-line bg-surface p-3">
        <p className="truncate text-xs font-medium">{COMPANY.name}</p>
        <p className="mt-0.5 text-[11px] text-ink-3">Total cash</p>
        <p className="num text-sm font-semibold">{formatMoney(total.current)}</p>
      </div>

      <nav aria-label="Primary" className="mt-5 flex flex-col gap-0.5">
        {NAV.map((n) => <Item key={n.to} {...n} />)}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5">
        {SECONDARY_NAV.map((n) => <Item key={n.to} {...n} />)}
        <div className="mt-3 flex items-center gap-2.5 border-t border-line px-2.5 pt-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">MC</span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">Maya Chen</p>
            <p className="truncate text-[11px] text-ink-3">CEO · Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {NAV.filter((n) => n.to !== '/accounts').map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-[10px]', isActive ? 'text-brand' : 'text-ink-3')}
        >
          <Icon className="h-5 w-5" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
