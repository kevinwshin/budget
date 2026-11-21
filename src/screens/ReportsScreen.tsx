import { useState } from 'react';
import { groupByBudgetTag, useData } from '../data';
import { useNav } from '../nav';
import { addMonths, lastMonths, monthLabel, monthShort } from '../dates';
import { balancesAtMonthEnd, kindTotal, monthFlows } from '../ledger';
import { formatMoney } from '../money';
import { HBars, Line } from '../components/charts';
import { count } from '../ui';
import type { Envelope, Id } from '../types';

type Report = 'month' | 'spending' | 'ivs' | 'inv' | 'accounts';
const REPORTS: [Report, string][] = [
  ['month', 'Month'], ['spending', 'Spending'],['ivs', 'Income vs spending'], ['inv', 'Investments'], ['accounts', 'Accounts'],
];

export function ReportsScreen() {
  const d = useData();
  const nav = useNav();
  const [report, setReport] = useState<Report>('month');
  const [acct, setAcct] = useState<Id | 'all'>('all');
  const inAcct = (e: Envelope | undefined) => !!e && (acct === 'all' || e.accountTagId === acct);
  const include = (id: Id) => inAcct(d.env(id));
  const months = lastMonths(nav.month, 6);
  const pool = d.envelopes.filter((e) => inAcct(e) && e.type !== 'income');

  let body;
  if (report === 'month') {
    const flows = monthFlows(d.txs, nav.month);
    const bal = balancesAtMonthEnd(d.txs, nav.month);
    const shown = [...d.envelopes.filter((e) => e.type === 'income' && inAcct(e)), ...groupByBudgetTag(d, pool).flatMap((g) => g.items)]
      .filter((e) => !e.archived || flows.has(e.id));
    body = (
      <>
        <div className="rows">
          <div className="row table-head table-row"><div className="main">Envelope</div><span className="c">In</span><span className="c">Out</span><span className="c wide">Balance</span></div>
          {shown.map((e) => {
            const f = flows.get(e.id) ?? { in: 0, out: 0 };
            const b = bal.get(e.id) ?? 0;
            return (
              <div className="row table-row" key={e.id}>
                <div className="main name sub" style={{ color: 'var(--text)', fontSize: 13 }}>{e.name}</div>
                <span className="c num">{formatMoney(f.in)}</span>
                <span className="c num">{formatMoney(f.out)}</span>
                <span className={`c wide num ${b < 0 ? 'neg' : ''}`}>{formatMoney(b)}</span>
              </div>
            );
          })}
        </div>
        <div className="note" style={{ marginTop: 10 }}>In: transfers in, income, value increases. Out: expenses, transfers out, value decreases.</div>
      </>
    );
  } else if (report === 'spending') {
    const byTag = new Map<string, number>();
    for (const t of d.txs) {
      if (t.kind !== 'expense' || !t.date.startsWith(nav.month)) continue;
      for (const l of t.lines) {
        const e = d.env(l.envelopeId);
        if (!inAcct(e)) continue;
        const name = d.budgetTag(e!.budgetTagId)?.name ?? 'Other';
        byTag.set(name, (byTag.get(name) ?? 0) - l.amount);
      }
    }
    body = <div className="card"><b>Spending by budget tag</b><HBars rows={[...byTag].filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).map(([label, v]) => ({ label, values: [v] }))} colors={['var(--primary)']} /></div>;
  } else if (report === 'ivs') {
    const inc = months.map((m) => kindTotal(d.txs, m, 'income', include));
    const spend = months.map((m) => -kindTotal(d.txs, m, 'expense', include) || 0);
    body = (
      <div className="card"><b>Income vs spending</b>
        <HBars rows={months.map((m, i) => ({ label: monthShort(m), values: [inc[i], spend[i]] })).reverse()} colors={['var(--primary)', 'var(--chart-2)']} />
        <div className="legend"><span><i style={{ background: 'var(--primary)' }} />Income</span><span><i style={{ background: 'var(--chart-2)' }} />Spending</span></div>
      </div>
    );
  } else if (report === 'inv') {
    const inv = pool.filter((e) => e.type === 'investment');
    body = inv.length ? inv.map((e) => (
      <div className="card" key={e.id}><b>{e.name}</b>
        <Line labels={months.map(monthShort)} values={months.map((m) => balancesAtMonthEnd(d.txs, m).get(e.id) ?? 0)} />
      </div>
    )) : <div className="empty">No investment envelopes.</div>;
  } else {
    const bal = balancesAtMonthEnd(d.txs, nav.month);
    const accts = d.accountTags.filter((a) => acct === 'all' || a.id === acct);
    body = (
      <>
        <div className="note">An account balance is the sum of the envelopes tagged with it. Compare it with your bank.</div>
        <div className="rows">
          {accts.map((a) => {
            const es = d.envelopes.filter((e) => e.accountTagId === a.id);
            const total = es.reduce((s, e) => s + (bal.get(e.id) ?? 0), 0);
            return (
              <div className="row" key={a.id}>
                <div className="main"><div className="name">{a.name}</div><div className="sub">{count(es.filter((e) => !e.archived).length, 'envelope')}</div></div>
                <span className={`bal ${total < 0 ? 'neg' : ''}`}>{formatMoney(total)}</span>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="appbar">
        <h1>Reports</h1>
        <select className="inp" style={{ width: 'auto', padding: '6px 8px' }} value={acct} onChange={(e) => setAcct(e.target.value)} aria-label="Account tag">
          <option value="all">All accounts</option>
          {d.accountTags.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div className="content">
        <div className="chips">
          {REPORTS.map(([k, l]) => <button key={k} className={`chip ${report === k ? 'on' : ''}`} onClick={() => setReport(k)}>{l}</button>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <button className="iconbtn" aria-label="Previous month" onClick={() => nav.setMonth(addMonths(nav.month, -1))}>‹</button>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>{report === 'ivs' || report === 'inv' ? `6 months to ${monthLabel(nav.month)}` : monthLabel(nav.month)}</div>
          <button className="iconbtn" aria-label="Next month" onClick={() => nav.setMonth(addMonths(nav.month, 1))}>›</button>
        </div>
        {body}
      </div>
    </>
  );
}
