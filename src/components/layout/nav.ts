import { ArrowLeftRight, BarChart3, CreditCard, Home, Landmark, Send, Settings, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Overview', icon: Home },
  { to: '/accounts', label: 'Accounts', icon: Landmark },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/payments', label: 'Payments', icon: Send },
  { to: '/cards', label: 'Cards', icon: CreditCard },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
];

export const SECONDARY_NAV: NavItem[] = [{ to: '/settings', label: 'Settings', icon: Settings }];
