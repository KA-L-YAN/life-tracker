import { addDays, localDateString, startOfDay } from './day.ts';

export type StepSource = 'health' | 'manual';
export type StepRow = { day: string; hour: number; source: StepSource; count: number };
export type SleepLike = { started_at: string; ended_at: string };

/** Health Connect hour buckets → local day + hour rows. Buckets with no steps are dropped. */
export function hourRows(buckets: { start: string; count: number }[]): { day: string; hour: number; count: number }[] {
  const merged = new Map<string, { day: string; hour: number; count: number }>();
  for (const b of buckets) {
    if (!b.count) continue;
    const at = new Date(b.start);
    const day = localDateString(at);
    const key = `${day}#${at.getHours()}`;
    const row = merged.get(key) ?? { day, hour: at.getHours(), count: 0 };
    row.count += Math.round(b.count);
    merged.set(key, row);
  }
  return [...merged.values()];
}

/** A day's steps: Health Connect's hourly counts when there are any, otherwise the typed-in total. */
export function dayTotal(rows: StepRow[], day: string): number {
  const today = rows.filter((r) => r.day === day);
  const health = today.filter((r) => r.source === 'health');
  return (health.length ? health : today.filter((r) => r.source === 'manual')).reduce((sum, r) => sum + r.count, 0);
}

/** 24 hourly counts for the dial's step ring (health data only: a typed total has no hours). */
export function hourly(rows: StepRow[], day: string): number[] {
  const out = Array.from({ length: 24 }, () => 0);
  for (const r of rows) if (r.day === day && r.source === 'health') out[r.hour] += r.count;
  return out;
}

/** The parts of sleep sessions that fall inside `day` (local midnight to midnight). */
export function sleepOnDay(sessions: SleepLike[], day: Date): { start: Date; end: Date }[] {
  const from = startOfDay(day);
  const to = addDays(from, 1);
  return sessions
    .map((s) => ({ start: new Date(Math.max(+new Date(s.started_at), +from)), end: new Date(Math.min(+new Date(s.ended_at), +to)) }))
    .filter((p) => p.end > p.start);
}

/** Minutes asleep that count toward `day`: sessions you woke up from on that day. */
export function sleepMinutes(sessions: SleepLike[], day: string): number {
  return Math.round(
    sessions
      .filter((s) => localDateString(new Date(s.ended_at)) === day)
      .reduce((sum, s) => sum + (+new Date(s.ended_at) - +new Date(s.started_at)), 0) / 60000,
  );
}

/** Bed and wake times as dates: bedtime on the evening before `wake` when it's later than wake. */
export function sleepWindow(wakeDay: Date, bed: number, wake: number): { start: Date; end: Date } {
  const end = new Date(startOfDay(wakeDay).getTime() + wake * 60000);
  const start = new Date(startOfDay(wakeDay).getTime() + bed * 60000);
  if (start >= end) start.setDate(start.getDate() - 1);
  return { start, end };
}
