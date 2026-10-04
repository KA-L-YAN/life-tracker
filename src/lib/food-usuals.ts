type Entry = { note: string; meal: string | null; logged_at: string };

/**
 * The things you eat most for a meal, most frequent first: logged at least twice, so a one-off
 * doesn't crowd the row. Spelling follows your most recent entry.
 */
export function usuals(entries: Entry[], meal: string, limit = 6): string[] {
  const byKey = new Map<string, { label: string; count: number; last: string }>();
  for (const e of entries) {
    if (e.meal !== meal) continue;
    const label = e.note.trim();
    const key = label.toLowerCase();
    if (!key) continue;
    const row = byKey.get(key) ?? { label, count: 0, last: '' };
    row.count++;
    if (e.logged_at > row.last) {
      row.last = e.logged_at;
      row.label = label;
    }
    byKey.set(key, row);
  }
  return [...byKey.values()]
    .filter((r) => r.count >= 2)
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
    .slice(0, limit)
    .map((r) => r.label);
}
