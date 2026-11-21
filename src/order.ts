/**
 * Gives rows that predate manual ordering an `order` that keeps the alphabetical order they
 * were shown in. Shared by the database upgrade and the backup migration so both agree.
 */
export function orderByName<T extends { name: string }>(rows: T[]): (T & { order: number })[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name)).map((r, i) => ({ ...r, order: i + 1 }));
}
