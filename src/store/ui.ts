import { create } from 'zustand';

export type Theme = 'light' | 'dark';
export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

export type Dialog = null | { kind: 'transfer' } | { kind: 'payment'; payeeId?: string } | { kind: 'card' };

interface UiState {
  theme: Theme;
  toasts: Toast[];
  paletteOpen: boolean;
  dialog: Dialog;
  /** Transaction whose details drawer is open. */
  txnId: string | null;
  setTheme: (theme: Theme) => void;
  toast: (t: Omit<Toast, 'id' | 'tone'> & { tone?: ToastTone }) => void;
  dismiss: (id: number) => void;
  setPaletteOpen: (open: boolean) => void;
  openDialog: (dialog: Dialog) => void;
  openTxn: (id: string | null) => void;
}

const initialTheme = (): Theme =>
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

let nextToast = 1;

export const useUi = create<UiState>()((set, get) => ({
  theme: initialTheme(),
  toasts: [],
  paletteOpen: false,
  dialog: null,
  txnId: null,
  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('ledgerline-theme', theme);
    } catch {
      /* storage unavailable: theme still applies for this session */
    }
    set({ theme });
  },
  toast: ({ tone = 'success', ...rest }) => {
    const id = nextToast++;
    set({ toasts: [...get().toasts, { id, tone, ...rest }] });
    setTimeout(() => get().dismiss(id), 5000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  openDialog: (dialog) => set({ dialog, paletteOpen: false }),
  openTxn: (txnId) => set({ txnId }),
}));
