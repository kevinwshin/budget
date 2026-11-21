import { useEffect } from 'react';
import { DataProvider, useData } from './data';
import { NavProvider, useNav, type Layer, type Tab } from './nav';
import { applyTheme } from './settings';
import { monthOf, today } from './dates';
import { DialogView } from './ui';
import { BudgetScreen } from './screens/BudgetScreen';
import { EnvelopeScreen } from './screens/EnvelopeScreen';
import { TransactionsScreen } from './screens/TransactionsScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ManageScreen } from './screens/ManageScreen';
import { AddSheet } from './sheets/AddSheet';
import { MoveSheet } from './sheets/MoveSheet';
import { ValueSheet } from './sheets/ValueSheet';
import { AdjustSheet } from './sheets/AdjustSheet';
import { TxSheet } from './sheets/TxSheet';
import { EnvMenuSheet } from './sheets/EnvMenuSheet';
import { EnvEditSheet } from './sheets/EnvEditSheet';
import { TagEditSheet } from './sheets/TagEditSheet';

export default function App() {
  return (
    <DataProvider>
      <NavProvider initialMonth={monthOf(today())}>
        <Shell />
      </NavProvider>
    </DataProvider>
  );
}

const TABS: [Tab | 'add', string, string][] = [
  ['budget', '▤', 'Budget'], ['tx', '≡', 'Transactions'], ['add', '+', 'Add'], ['reports', '▥', 'Reports'], ['settings', '⚙', 'Settings'],
];

function Shell() {
  const d = useData();
  const nav = useNav();
  useEffect(() => applyTheme(d.settings.theme), [d.settings.theme]);

  const page = [...nav.layers].reverse().find((l): l is Extract<Layer, { page: unknown }> => 'page' in l)?.page;
  const top = nav.layers[nav.layers.length - 1];

  let screen;
  if (page?.type === 'envelope') screen = <EnvelopeScreen id={page.id} />;
  else if (page?.type === 'manage') screen = <ManageScreen page={page.page} />;
  else if (nav.tab === 'budget') screen = <BudgetScreen />;
  else if (nav.tab === 'tx') screen = <TransactionsScreen />;
  else if (nav.tab === 'reports') screen = <ReportsScreen />;
  else screen = <SettingsScreen />;

  return (
    <div className="app">
      {screen}
      <nav className="nav">
        {TABS.map(([k, ic, label]) => k === 'add'
          ? <button key={k} className="add" aria-label="Add transaction" onClick={() => nav.push({ sheet: { type: 'add', kind: 'expense' } })}><span className="ic">{ic}</span>{label}</button>
          : <button key={k} className={nav.tab === k && !page ? 'on' : ''} onClick={() => nav.goTab(k)}><span className="ic">{ic}</span>{label}</button>)}
      </nav>
      {top && 'sheet' in top && <SheetView key={nav.layers.length} sheet={top.sheet} />}
      {top && 'dialog' in top && <DialogView d={top.dialog} />}
      {nav.toastMsg && <div className="toast" role="status">{nav.toastMsg}</div>}
    </div>
  );
}

function SheetView({ sheet: s }: { sheet: Extract<Layer, { sheet: unknown }>['sheet'] }) {
  switch (s.type) {
    case 'add': return <AddSheet kind={s.kind} edit={s.edit} />;
    case 'move': return <MoveSheet {...s} />;
    case 'value': return <ValueSheet envId={s.envId} />;
    case 'adjust': return <AdjustSheet envId={s.envId} />;
    case 'tx': return <TxSheet txId={s.txId} />;
    case 'envMenu': return <EnvMenuSheet envId={s.envId} />;
    case 'envEdit': return <EnvEditSheet envId={s.envId} />;
    case 'tagEdit': return <TagEditSheet kind={s.kind} id={s.id} />;
  }
}
