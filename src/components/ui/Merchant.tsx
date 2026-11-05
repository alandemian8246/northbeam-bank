import {
  ArrowLeftRight, Briefcase, Building2, Cloud, Code2, Landmark, Megaphone, Percent,
  Plane, Shield, TrendingUp, Users, UtensilsCrossed, type LucideIcon,
} from 'lucide-react';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/cn';

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  Revenue: TrendingUp,
  Payroll: Users,
  Software: Code2,
  Infrastructure: Cloud,
  'Rent & Office': Building2,
  Marketing: Megaphone,
  Travel: Plane,
  Meals: UtensilsCrossed,
  'Professional Services': Briefcase,
  Taxes: Landmark,
  Insurance: Shield,
  Interest: Percent,
  Transfer: ArrowLeftRight,
};

/** Circular avatar showing the category icon for a counterparty. */
export function MerchantAvatar({ category, size = 'md' }: { category: Category; size?: 'sm' | 'md' }) {
  const Icon = CATEGORY_ICON[category];
  const income = category === 'Revenue' || category === 'Interest';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-line',
        income ? 'bg-good-soft text-good' : 'bg-subtle text-ink-2',
        size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
      )}
      aria-hidden
    >
      <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
    </span>
  );
}
