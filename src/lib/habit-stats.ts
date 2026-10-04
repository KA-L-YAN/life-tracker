import { addDays, localDateString, startOfDay } from './day.ts';

type LogLike = { habit_id: string; logged_at: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local YYYY-MM-DD dates that have at least one log (optionally for one habit). */
export function logDays(logs: LogLike[], habitId?: string): Set<string> {
  const days = new Set<string>();
  for (const log of logs) {
    if (!habitId || log.habit_id === habitId) days.add(localDateString(new Date(log.logged_at)));
  }
  return days;
}

/** Consecutive done-days ending today — or yesterday, so an unfinished today doesn't zero the streak. */
export function currentStreak(days: Set<string>, today = new Date()): number {
  let cursor = days.has(localDateString(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(localDateString(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestStreak(days: Set<string>): number {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    run = prev && localDateString(addDays(prev, 1)) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = date;
  }
  return best;
}

/** Whole calendar days since the last slip (or since the habit started, if never). */
export function daysClean(lastLogIso: string | null, startedIso: string, now = new Date()): number {
  const from = startOfDay(new Date(lastLogIso ?? startedIso));
  return Math.max(0, Math.round((startOfDay(now).getTime() - from.getTime()) / DAY_MS));
}

/** Per-day counts for the trailing `days` days (oldest first). */
export function countsByDay(logs: LogLike[], days: number, habitId?: string, today = new Date()) {
  const counts = new Map<string, number>();
  for (const log of logs) {
    if (habitId && log.habit_id !== habitId) continue;
    const key = localDateString(new Date(log.logged_at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const key = localDateString(addDays(today, i - (days - 1)));
    return { date: key, count: counts.get(key) ?? 0 };
  });
}
