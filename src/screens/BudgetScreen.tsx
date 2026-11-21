import { groupByBudgetTag, useData } from '../data';
import { useNav } from '../nav';
import { daysSince } from '../dates';
import { formatMoney } from '../money';
import type { Envelope } from '../types';

export function BudgetScreen() {
  const d = useData();
  const nav = useNav();
  const b = (e: Envelope) => d.balance.get(e.id) ?? 0;
  const active = d.envelopes.filter((e) => !e.archived);
  const negatives = active.filter((e) => b(e) < 0);
  const groups = groupByBudgetTag(d, active.filter((e) => e.type !== 'income'));
  const last = d.settings.lastBackupAt;
  const backupDue = d.txs.length > 0 && (!last || daysSince(last) > 30);
  const tiles = d.settings.envelopeLayout === 'tiles';
  const income = d.income;

  const sub = (e: Envelope) => d.accountTag(e.accountTagId)?.name ?? '';
  const cls = (e: Envelope) => (b(e) < 0 ? 'neg' : b(e) === 0 ? 'zero' : '');
  const open = (e: Envelope) => nav.push({ page: { type: 'envelope', id: e.id } });

  return (
    <>
      <div className="appbar"><h1>Budget</h1></div>
      <div className="content">
        {backupDue && (
          <div className="banner warn"><span>{last ? `Last backup was ${daysSince(last)} days ago.` : 'You have no backup yet.'}</span>
            <button onClick={() => nav.goTab('settings')}>Back up</button></div>
        )}
        {income && (
          <div className="card rta">
            <div style={{ flex: 1 }}>
              <div className="amt">{formatMoney(b(income))}</div>
              <div className="lbl">Ready to assign · {income.name}</div>
            </div>
            <button className="btn" onClick={() => nav.push({ sheet: { type: 'move', title: 'Assign income', from: [{ id: income.id, amount: 0 }], to: [{ id: '', amount: 0 }] } })}>Assign</button>
          </div>
        )}
        {negatives.length > 0 && (
          <div className="banner neg">
            <span>{negatives.length === 1 ? '1 envelope is' : `${negatives.length} envelopes are`} overspent: {negatives.map((e) => `${e.name} ${formatMoney(b(e))}`).join(', ')}</span>
            {income && <button onClick={() => nav.push({ sheet: { type: 'move', title: 'Cover overspending', from: [{ id: income.id, amount: 0 }], to: [{ id: negatives[0].id, amount: -b(negatives[0]) }] } })}>Cover</button>}
          </div>
        )}
        {groups.length === 0 && (
          <div className="empty">No envelopes yet. Add a budget tag, then an envelope.</div>
        )}
        {groups.map((g) => (
          <div className="group" key={g.tag.id}>
            <div className="ghead"><span>{g.tag.name}</span><span className="num">{formatMoney(g.items.reduce((s, e) => s + b(e), 0))}</span></div>
            {tiles ? (
              <div className="tiles">
                {g.items.map((e) => (
                  <button key={e.id} className={`tile ${cls(e)}`} onClick={() => open(e)}>
                    <div className="tname">{e.name}</div>
                    <div className="tbal">{formatMoney(b(e))}</div>
                    <div className="tsub">{sub(e)}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rows">
                {g.items.map((e) => (
                  <button key={e.id} className="row" onClick={() => open(e)}>
                    <div className="main"><div className="name">{e.name}</div><div className="sub">{sub(e)}</div></div>
                    <span className={`bal ${cls(e)}`}>{formatMoney(b(e))}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <button className="btn tonal" style={{ flex: 1 }} onClick={() => nav.push({ sheet: { type: 'envEdit' } })}>+ Envelope</button>
          <button className="btn tonal" style={{ flex: 1 }} onClick={() => nav.push({ sheet: { type: 'tagEdit', kind: 'budget' } })}>+ Budget tag</button>
        </div>
      </div>
    </>
  );
}
