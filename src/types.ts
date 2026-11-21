export type Id = string;

export interface AccountTag {
  id: Id;
  name: string;
  order: number;
}

export interface BudgetTag {
  id: Id;
  name: string;
  order: number;
}

export type EnvelopeType = 'income' | 'standard' | 'investment';

export interface Envelope {
  id: Id;
  name: string;
  type: EnvelopeType;
  /** Null only for the income envelope. */
  budgetTagId: Id | null;
  accountTagId: Id;
  archived: boolean;
  /** Position within the envelope's budget tag group. */
  order: number;
}

export type TxKind = 'expense' | 'income' | 'transfer' | 'revaluation' | 'adjustment';

/** Signed amount in the currency's smallest unit: negative takes money out of the envelope. */
export interface TxLine {
  envelopeId: Id;
  amount: number;
}

export interface Transaction {
  id: Id;
  kind: TxKind;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  payee?: string;
  note?: string;
  /** A transfer's lines sum to zero: negative lines are the sources, positive lines the destinations. */
  lines: TxLine[];
  /** Copy of the line envelope ids, kept for the multi-entry index. */
  envelopeIds: Id[];
  createdAt: string;
}

export type Theme = 'system' | 'light' | 'dark';
export type EnvelopeLayout = 'tiles' | 'list';

export interface Settings {
  theme: Theme;
  envelopeLayout: EnvelopeLayout;
  lastBackupAt: string | null;
}

export interface SettingRow {
  key: keyof Settings;
  value: Settings[keyof Settings];
}
