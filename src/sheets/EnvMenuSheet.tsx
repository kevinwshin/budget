import { useData } from '../data';
import { useNav } from '../nav';
import { formatMoney } from '../money';
import { setArchived } from '../ops';
import { SheetFrame } from '../ui';
import type { Id } from '../types';

export function EnvMenuSheet({ envId }: { envId: Id }) {
  const d = useData();
  const nav = useNav();
  const e = d.env(envId);
  if (!e) return null;
  const bal = d.balance.get(envId) ?? 0;

  const archive = () => {
    if (bal !== 0) {
      nav.replaceTop({ dialog: {
        title: 'Cannot archive yet',
        body: `${e.name} holds ${formatMoney(bal)}. Move the balance to another envelope first.`,
        confirm: 'Move money',
        onConfirm: () => nav.replaceTop({ sheet: { type: 'move', from: [{ id: envId, amount: 0 }], to: [{ id: '', amount: 0 }] } }),
      } });
      return;
    }
    nav.replaceTop({ dialog: {
      title: `Archive ${e.name}?`,
      body: 'It disappears from the budget screen. Its history stays in transactions and reports. You can restore it from Settings > Envelopes.',
      confirm: 'Archive',
      onConfirm: async () => {
        await setArchived(envId, true);
        nav.pop(2);
        nav.toast(`${e.name} archived`);
      },
    } });
  };

  const adjust = () => nav.replaceTop({ dialog: {
    title: 'Adjust balance?',
    body: 'Use this only to correct a mistake you cannot find. For interest, use an income entry. For investments, use Update value.',
    confirm: 'Continue', danger: true,
    onConfirm: () => nav.replaceTop({ sheet: { type: 'adjust', envId } }),
  } });

  return (
    <SheetFrame title={e.name}>
      <button className="menu-row" onClick={() => nav.replaceTop({ sheet: { type: 'envEdit', envId } })}>Edit envelope</button>
      {e.type !== 'income' && (e.archived
        ? <button className="menu-row" onClick={async () => { await setArchived(envId, false); nav.pop(); nav.toast(`${e.name} restored`); }}>Restore</button>
        : <button className="menu-row" onClick={archive}>Archive</button>)}
      <button className="menu-row muted" onClick={adjust}>Adjust balance…</button>
    </SheetFrame>
  );
}
