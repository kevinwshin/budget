import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Id, Transaction } from './types';

export type Tab = 'budget' | 'tx' | 'reports' | 'settings';
export type ManagePage = 'envelopes' | 'budgetTags' | 'accountTags';
export type LineDraft = { id: Id; amount: number };

export type Page =
  | { type: 'envelope'; id: Id }
  | { type: 'manage'; page: ManagePage };

export type Sheet =
  | { type: 'add'; kind: 'expense' | 'income'; edit?: Transaction }
  | { type: 'move'; title?: string; from: LineDraft[]; to: LineDraft[]; edit?: Transaction }
  | { type: 'value'; envId: Id }
  | { type: 'adjust'; envId: Id }
  | { type: 'tx'; txId: Id }
  | { type: 'envMenu'; envId: Id }
  | { type: 'envEdit'; envId?: Id }
  | { type: 'tagEdit'; kind: 'budget' | 'account'; id?: Id };

export interface Dialog {
  title: string;
  body: string;
  confirm: string;
  danger?: boolean;
  /** Runs on confirm. It must close or replace the dialog itself. */
  onConfirm: () => void | Promise<void>;
  /** Omit to show only the confirm button. */
  cancel?: string | null;
}

export type Layer = { page: Page } | { sheet: Sheet } | { dialog: Dialog };

interface Nav {
  tab: Tab;
  month: string;
  setMonth: (m: string) => void;
  layers: Layer[];
  goTab: (t: Tab) => void;
  push: (l: Layer) => void;
  replaceTop: (l: Layer) => void;
  /** Closes the top layer through browser history, so the Android back button and the UI agree. */
  pop: (count?: number) => void;
  toast: (msg: string, kind?: 'info' | 'error') => void;
  toastMsg: { text: string; kind: 'info' | 'error' } | null;
  dismissToast: () => void;
}

const Ctx = createContext<Nav | null>(null);

/**
 * Every open layer (page, sheet, dialog) owns one history entry holding its depth.
 * Opening pushes an entry; closing calls history.back(); the popstate handler trims the
 * layer stack to the depth of the entry the browser lands on.
 */
export function NavProvider({ initialMonth, children }: { initialMonth: string; children: ReactNode }) {
  const [tab, setTab] = useState<Tab>('budget');
  const [month, setMonth] = useState(initialMonth);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [toastMsg, setToast] = useState<Nav['toastMsg']>(null);
  const depth = useRef(0);
  const pendingTab = useRef<Tab | null>(null);
  const toastTimer = useRef<number>(undefined);
  const rewound = useRef(false);

  useEffect(() => {
    // A reload with a layer open keeps that layer's history entry while the app starts with no
    // layers. Step back to the base entry so the first Back press is not spent on a stale entry.
    // The ref stops React's development-mode second effect run from stepping back twice.
    const stale = history.state?.depth;
    if (!rewound.current && typeof stale === 'number' && stale > 0) history.go(-stale);
    rewound.current = true;
  }, []);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const d = typeof e.state?.depth === 'number' ? e.state.depth : 0;
      depth.current = d;
      setLayers((prev) => prev.slice(0, d));
      if (d === 0 && pendingTab.current) {
        setTab(pendingTab.current);
        pendingTab.current = null;
      }
    };
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  // Save buttons start their async work without awaiting it, so a failed save surfaces only
  // as an unhandled rejection. Showing those here keeps a failure from looking like a dead button.
  useEffect(() => {
    // Dexie appends the browser's own error on a second line; the first line says it already.
    const show = (reason: unknown) => {
      const text = reason instanceof Error ? reason.message : String(reason);
      showToast(`Error: ${text.split('\n')[0].trim()}`, 'error');
    };
    const onRejection = (e: PromiseRejectionEvent) => show(e.reason);
    const onError = (e: ErrorEvent) => show(e.error ?? e.message);
    addEventListener('unhandledrejection', onRejection);
    addEventListener('error', onError);
    return () => {
      removeEventListener('unhandledrejection', onRejection);
      removeEventListener('error', onError);
    };
  }, []);

  function showToast(text: string, kind: 'info' | 'error' = 'info') {
    setToast({ text, kind });
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), kind === 'error' ? 6000 : 2200);
  }

  const nav: Nav = {
    tab, month, setMonth, layers, toastMsg,
    goTab: (t) => {
      if (depth.current > 0) {
        pendingTab.current = t;
        history.go(-depth.current);
      } else setTab(t);
    },
    push: (l) => {
      depth.current += 1;
      history.pushState({ depth: depth.current }, '');
      setLayers((prev) => [...prev, l]);
    },
    replaceTop: (l) => setLayers((prev) => [...prev.slice(0, -1), l]),
    pop: (count = 1) => history.go(-Math.min(count, depth.current)),
    toast: showToast,
    dismissToast: () => {
      clearTimeout(toastTimer.current);
      setToast(null);
    },
  };
  return <Ctx.Provider value={nav}>{children}</Ctx.Provider>;
}

export function useNav(): Nav {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNav outside NavProvider');
  return v;
}
