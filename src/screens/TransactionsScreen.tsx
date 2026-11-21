import { useState } from 'react';
import { useData } from '../data';
import { dateLabel } from '../dates';
import { sortNewest } from '../ledger';
import { TxRow } from '../components/TxRow';
import type { Id, Transaction } from '../types';

export function TransactionsScreen() {
  const d = useData();
  const [tag, setTag] = useState<Id | 'all'>('all');
  const list = sortNewest(d.txs).filter((t) => tag === 'all' || t.envelopeIds.some((id) => d.env(id)?.budgetTagId === tag));
  const days: [string, Transaction[]][] = [];
  for (const t of list) {
    const lastDay = days[days.length - 1];
    if (lastDay && lastDay[0] === t.date) lastDay[1].push(t);
    else days.push([t.date, [t]]);
  }
  return (
    <>
      <div className="appbar"><h1>Transactions</h1></div>
      <div className="content">
        <div className="chips">
          <button className={`chip ${tag === 'all' ? 'on' : ''}`} onClick={() => setTag('all')}>All</button>
          {d.budgetTags.map((b) => <button key={b.id} className={`chip ${tag === b.id ? 'on' : ''}`} onClick={() => setTag(b.id)}>{b.name}</button>)}
        </div>
        {days.length === 0 && <div className="empty">No transactions.</div>}
        {days.map(([day, txs]) => (
          <div key={day}>
            <div className="dayhead">{dateLabel(day)}</div>
            <div className="rows">{txs.map((t) => <TxRow key={t.id} t={t} />)}</div>
          </div>
        ))}
      </div>
    </>
  );
}
