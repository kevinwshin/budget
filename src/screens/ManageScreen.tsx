import { groupByBudgetTag, useData } from '../data';
import { useNav, type ManagePage } from '../nav';
import { formatMoney } from '../money';
import { moveAccountTag, moveBudgetTag, moveEnvelope, setArchived } from '../ops';
import type { Id } from '../types';
import { count } from '../ui';
import type { Envelope } from '../types';

const TITLES: Record<ManagePage, string> = { envelopes: 'Envelopes', budgetTags: 'Budget tags', accountTags: 'Account tags' };

export function ManageScreen({ page }: { page: ManagePage }) {
  const nav = useNav();
  return (
    <>
      <div className="appbar">
        <button className="iconbtn" aria-label="Back" onClick={() => nav.pop()}>←</button>
        <h1>{TITLES[page]}</h1>
      </div>
      <div className="content">
        {page === 'envelopes' && <Envelopes />}
        {page === 'budgetTags' && <BudgetTags />}
        {page === 'accountTags' && <AccountTags />}
      </div>
    </>
  );
}

function Envelopes() {
  const d = useData();
  const nav = useNav();
  const row = (e: Envelope, restore = false, reorder?: { first: boolean; last: boolean }) => (
    <div className={`row${reorder ? ' tagrow' : ''}`} key={e.id}>
      <button className="main" style={{ background: 'none', border: 0, textAlign: 'left', padding: 0 }} onClick={() => nav.push({ sheet: { type: 'envEdit', envId: e.id } })}>
        <div className="name">{e.name}</div>
        <div className="sub">{[d.accountTag(e.accountTagId)?.name, e.type === 'investment' ? 'investment' : e.type === 'income' ? 'income' : ''].filter(Boolean).join(' · ')}</div>
      </button>
      {restore
        ? <button className="btn text" onClick={() => void setArchived(e.id, false)}>Restore</button>
        : <span className="num">{formatMoney(d.balance.get(e.id) ?? 0)}</span>}
      {reorder && <MoveButtons id={e.id} first={reorder.first} last={reorder.last} move={moveEnvelope} />}
    </div>
  );
  const active = d.envelopes.filter((e) => !e.archived);
  const archived = d.envelopes.filter((e) => e.archived);
  return (
    <>
      <button className="btn block" style={{ marginBottom: 12 }} onClick={() => nav.push({ sheet: { type: 'envEdit' } })}>Add envelope</button>
      {d.income && <div className="rows" style={{ marginBottom: 12 }}>{row(d.income)}</div>}
      {groupByBudgetTag(d, active.filter((e) => e.type !== 'income')).map((g) => (
        <div className="group" key={g.tag.id}>
          <div className="ghead"><span>{g.tag.name}</span></div>
          <div className="rows">{g.items.map((e, i) => row(e, false, { first: i === 0, last: i === g.items.length - 1 }))}</div>
        </div>
      ))}
      {archived.length > 0 && (
        <div className="group">
          <div className="ghead"><span>Archived</span></div>
          <div className="rows">{archived.map((e) => row(e, true))}</div>
        </div>
      )}
    </>
  );
}

function BudgetTags() {
  const d = useData();
  const nav = useNav();
  return (
    <>
      <button className="btn block" style={{ marginBottom: 12 }} onClick={() => nav.push({ sheet: { type: 'tagEdit', kind: 'budget' } })}>Add budget tag</button>
      {d.budgetTags.length === 0 && <div className="note">Budget tags group envelopes on the budget screen, for example Housing or Entertainment.</div>}
      {d.budgetTags.length > 0 && (
        <div className="rows">
          {d.budgetTags.map((t, i) => (
            <div className="row tagrow" key={t.id}>
              <button className="main" style={{ background: 'none', border: 0, textAlign: 'left', padding: 0 }} onClick={() => nav.push({ sheet: { type: 'tagEdit', kind: 'budget', id: t.id } })}>
                <div className="name">{t.name}</div>
                <div className="sub">{count(d.envelopes.filter((e) => e.budgetTagId === t.id && !e.archived).length, 'envelope')}</div>
              </button>
              <MoveButtons id={t.id} first={i === 0} last={i === d.budgetTags.length - 1} move={moveBudgetTag} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function AccountTags() {
  const d = useData();
  const nav = useNav();
  return (
    <>
      <button className="btn block" style={{ marginBottom: 12 }} onClick={() => nav.push({ sheet: { type: 'tagEdit', kind: 'account' } })}>Add account tag</button>
      <div className="rows">
        {d.accountTags.map((t, i) => (
          <div className="row tagrow" key={t.id}>
            <button className="main" style={{ background: 'none', border: 0, textAlign: 'left', padding: 0 }} onClick={() => nav.push({ sheet: { type: 'tagEdit', kind: 'account', id: t.id } })}>
              <div className="name">{t.name}</div>
              <div className="sub">{count(d.envelopes.filter((e) => e.accountTagId === t.id && !e.archived).length, 'envelope')}</div>
            </button>
            <MoveButtons id={t.id} first={i === 0} last={i === d.accountTags.length - 1} move={moveAccountTag} />
          </div>
        ))}
      </div>
    </>
  );
}

function MoveButtons({ id, first, last, move }: { id: Id; first: boolean; last: boolean; move: (id: Id, dir: -1 | 1) => Promise<void> }) {
  return (
    <>
      <button className="iconbtn" aria-label="Move up" disabled={first} onClick={() => void move(id, -1)}>↑</button>
      <button className="iconbtn" aria-label="Move down" disabled={last} onClick={() => void move(id, 1)}>↓</button>
    </>
  );
}
