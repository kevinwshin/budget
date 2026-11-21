import { db } from './db';
import type { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  envelopeLayout: 'tiles',
  lastBackupAt: null,
};

export function rowsToSettings(rows: { key: string; value: unknown }[]): Settings {
  const s: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in DEFAULT_SETTINGS) s[r.key] = r.value;
  return s as unknown as Settings;
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await db.settings.put({ key, value });
}

/** Applies the theme and refreshes the cache that index.html reads before first paint. */
export function applyTheme(theme: Settings['theme']): void {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // Storage can be blocked; the database still holds the setting.
  }
}
