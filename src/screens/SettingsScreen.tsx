import { useRef } from 'react';
import { useData } from '../data';
import { useNav } from '../nav';
import { daysSince } from '../dates';
import { exportBackup, parseBackup, restoreBackup } from '../backup';
import { deleteAllData } from '../db';
import { setSetting } from '../settings';
import { count } from '../ui';
import type { EnvelopeLayout, Theme } from '../types';

export function SettingsScreen() {
  const d = useData();
  const nav = useNav();
  const file = useRef<HTMLInputElement>(null);
  const last = d.settings.lastBackupAt;
  const overdue = d.txs.length > 0 && (!last || daysSince(last) > 30);

  const onExport = async () => {
    try {
      nav.toast(`Saved ${await exportBackup()}`);
    } catch (e) {
      nav.toast(`Export failed: ${(e as Error).message}`, 'error');
    }
  };

  // Three presses: the button, Continue, then Delete everything.
  const onDeleteAll = () => nav.push({ dialog: {
    title: 'Delete all data?',
    body: `This removes every envelope, transaction, tag, and setting on this phone (${count(d.txs.length, 'transaction')}). Export a backup first if you might want it back.`,
    confirm: 'Continue', danger: true,
    onConfirm: () => nav.replaceTop({ dialog: {
      title: 'This cannot be undone',
      body: 'The app will start over with only an empty Income envelope.',
      confirm: 'Delete everything', danger: true,
      onConfirm: async () => {
        await deleteAllData();
        nav.pop();
        nav.toast('All data deleted');
      },
    } }),
  } });

  const onFile = async (f: File | undefined) => {
    if (file.current) file.current.value = '';
    if (!f) return;
    try {
      const { data, warnings } = parseBackup(await f.text());
      nav.push({ dialog: {
        title: 'Replace all data?',
        body: [`This replaces every envelope, transaction, and setting on this phone with the backup from ${new Date(data.exportedAt).toLocaleString()}.`, ...warnings].join(' '),
        confirm: 'Replace', danger: true,
        onConfirm: async () => {
          await restoreBackup(data);
          nav.pop();
          nav.toast('Backup restored');
        },
      } });
    } catch (e) {
      nav.push({ dialog: { title: 'Cannot import', body: (e as Error).message, confirm: 'OK', cancel: null, onConfirm: () => nav.pop() } });
    }
  };

  const seg = <T extends string>(value: T, opts: [T, string][], set: (v: T) => void) => (
    <div className="seg" style={{ margin: '10px 0 0' }}>
      {opts.map(([k, l]) => <button key={k} className={value === k ? 'on' : ''} onClick={() => set(k)}>{l}</button>)}
    </div>
  );
  const manage = (page: 'envelopes' | 'budgetTags' | 'accountTags', name: string, sub: string) => (
    <button className="row" onClick={() => nav.push({ page: { type: 'manage', page } })}>
      <div className="main"><div className="name">{name}</div><div className="sub">{sub}</div></div>›
    </button>
  );
  const activeCount = d.envelopes.filter((e) => !e.archived).length;
  const archivedCount = d.envelopes.length - activeCount;

  return (
    <>
      <div className="appbar"><h1>Settings</h1></div>
      <div className="content">
        <div className="card">
          <b>Backup</b>
          <div className="note" style={overdue ? { color: 'var(--warn)' } : undefined}>
            {last ? `Last backup: ${new Date(last).toLocaleDateString()} (${daysSince(last)} days ago).` : 'No backup yet.'} Your data exists only on this phone.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={onExport}>Export backup</button>
            <button className="btn tonal" onClick={() => file.current?.click()}>Import</button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
          </div>
        </div>
        <div className="dayhead">Manage</div>
        <div className="rows">
          {manage('envelopes', 'Envelopes', `${activeCount} active${archivedCount ? ` · ${archivedCount} archived` : ''}`)}
          {manage('budgetTags', 'Budget tags', count(d.budgetTags.length, 'tag'))}
          {manage('accountTags', 'Account tags', d.accountTags.map((a) => a.name).join(', '))}
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <b>Envelope layout</b>
          {seg<EnvelopeLayout>(d.settings.envelopeLayout, [['tiles', 'Tiles'], ['list', 'List']], (v) => void setSetting('envelopeLayout', v))}
        </div>
        <div className="card">
          <b>Theme</b>
          {seg<Theme>(d.settings.theme, [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], (v) => void setSetting('theme', v))}
        </div>
        <div className="card" style={{ marginTop: 24 }}>
          <b>Delete all data</b>
          <div className="note">Removes everything on this phone and starts over.</div>
          <button className="btn danger" onClick={onDeleteAll}>Delete all data</button>
        </div>
      </div>
    </>
  );
}
