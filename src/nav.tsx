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
  toast: (msg: string) => void;
  toastMsg: string | null;
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
  const [toastMsg, setToast] = useState<string | null>(null);
  const depth = useRef(0);
  const pendingTab = useRef<Tab | null>(null);
  const toastTimer = useRef<number>(undefined);

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
    toast: (msg) => {
      setToast(msg);
      clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 2200);
    },
  };
  return <Ctx.Provider value={nav}>{children}</Ctx.Provider>;
}

export function useNav(): Nav {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNav outside NavProvider');
  return v;
}
