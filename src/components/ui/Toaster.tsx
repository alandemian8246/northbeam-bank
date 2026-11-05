import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/cn';

const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
const colors = { success: 'text-good', error: 'text-bad', info: 'text-brand' };

export function Toaster() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismiss);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-20 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 lg:bottom-4">
      {toasts.map((t) => {
        const Icon = icons[t.tone];
        return (
          <div key={t.id} role="status" className="pointer-events-auto flex animate-slide-up items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-pop">
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', colors[t.tone])} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-ink-2">{t.description}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="rounded p-0.5 text-ink-3 hover:text-ink" aria-label="Dismiss notification">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
