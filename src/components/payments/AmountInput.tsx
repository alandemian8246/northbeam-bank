import { useId } from 'react';
import { cn } from '@/lib/cn';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  autoFocus?: boolean;
}

/** Dollar input that accepts digits, commas and up to two decimals. */
export function AmountInput({ label, value, onChange, error, hint, autoFocus }: Props) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">$</span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          data-autofocus={autoFocus || undefined}
          placeholder="0.00"
          value={value}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d.,]/g, '');
            if (/^[\d,]*(\.\d{0,2})?$/.test(v)) onChange(v);
          }}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          className={cn('field num pl-7 text-base', error && 'border-bad focus:border-bad focus:ring-bad/20')}
        />
      </div>
      {(error || hint) && (
        <p id={`${id}-msg`} className={cn('mt-1.5 text-xs', error ? 'text-bad' : 'text-ink-3')}>{error ?? hint}</p>
      )}
    </div>
  );
}
