import type { StepRow } from '@/lib/body';
import { addDays, dayRange, localDateString, startOfDay } from '@/lib/day';
import { pageAll, supabase } from '@/lib/supabase';

async function userId() {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Sign in again to save that.');
  return id;
}

// Steps ------------------------------------------------------------------------------------------

/** Hourly rows for whole days `from`..`to` (inclusive). */
export async function listSteps(from: Date, to: Date): Promise<StepRow[]> {
  return pageAll<StepRow>((a, b) =>
    supabase
      .from('steps')
      .select('day, hour, source, count')
      .gte('day', localDateString(from))
      .lte('day', localDateString(to))
      .order('day')
      .range(a, b),
  );
}

/** Day totals (health data preferred), from the steps_daily view. */
export async function listDailySteps(from: Date, to: Date): Promise<{ day: string; total: number }[]> {
  const { data, error } = await supabase
    .from('steps_daily')
    .select('day, total')
    .gte('day', localDateString(from))
    .lte('day', localDateString(to))
    .order('day');
  if (error) throw error;
  return data as { day: string; total: number }[];
}

export async function saveHealthSteps(rows: { day: string; hour: number; count: number }[]): Promise<void> {
  if (!rows.length) return;
  const user_id = await userId();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('steps')
    .upsert(rows.map((r) => ({ ...r, user_id, source: 'health', updated_at: now })), { onConflict: 'user_id,day,hour,source' });
  if (error) throw error;
}

/** A typed-in total for the whole day; 0 clears it. */
export async function setManualSteps(day: Date, count: number): Promise<void> {
  const user_id = await userId();
  const key = { user_id, day: localDateString(day), hour: 0, source: 'manual' };
  const { error } =
    count > 0
      ? await supabase.from('steps').upsert({ ...key, count, updated_at: new Date().toISOString() }, { onConflict: 'user_id,day,hour,source' })
      : await supabase.from('steps').delete().match(key);
  if (error) throw error;
}

// Sleep ------------------------------------------------------------------------------------------

export type SleepSession = { id: string; started_at: string; ended_at: string; source: 'health' | 'manual' };

/** Sessions that overlap days `from`..`to`, oldest first. */
export async function listSleep(from: Date, to: Date): Promise<SleepSession[]> {
  const { data, error } = await supabase
    .from('sleep_sessions')
    .select('id, started_at, ended_at, source')
    .gte('ended_at', startOfDay(from).toISOString())
    .lt('started_at', dayRange(to).end.toISOString())
    .order('started_at');
  if (error) throw error;
  return data as SleepSession[];
}

export async function addSleep(start: Date, end: Date): Promise<void> {
  const { error } = await supabase.from('sleep_sessions').insert({ started_at: start.toISOString(), ended_at: end.toISOString(), source: 'manual' });
  if (error) throw error;
}

export async function deleteSleep(id: string): Promise<void> {
  const { error } = await supabase.from('sleep_sessions').delete().eq('id', id);
  if (error) throw error;
}

export async function saveHealthSleep(sessions: { external_id: string; started_at: string; ended_at: string }[]): Promise<void> {
  if (!sessions.length) return;
  const user_id = await userId();
  const { error } = await supabase
    .from('sleep_sessions')
    .upsert(sessions.map((s) => ({ ...s, user_id, source: 'health' })), { onConflict: 'user_id,external_id' });
  if (error) throw error;
}

// Water ------------------------------------------------------------------------------------------

export type WaterLog = { id: string; logged_at: string; ml: number; source: 'health' | 'manual' };

export const GLASS_ML = 250;

/** Glasses drunk: by volume, so a 500 ml bottle from Health Connect counts as two. */
export const glasses = (logs: { ml: number }[]) => Math.round(logs.reduce((sum, w) => sum + w.ml, 0) / GLASS_ML);

export async function listWater(from: Date, to: Date): Promise<WaterLog[]> {
  const { data, error } = await supabase
    .from('water_logs')
    .select('id, logged_at, ml, source')
    .gte('logged_at', startOfDay(from).toISOString())
    .lt('logged_at', dayRange(to).end.toISOString())
    .order('logged_at');
  if (error) throw error;
  return data as WaterLog[];
}

/** Returns the new row's id, for Undo. Past days get a midday timestamp. */
export async function addWater(day: Date = new Date(), ml = GLASS_ML): Promise<string> {
  const isToday = localDateString(day) === localDateString(new Date());
  const at = isToday ? new Date() : new Date(startOfDay(day).getTime() + 12 * 3600000);
  const { data, error } = await supabase.from('water_logs').insert({ logged_at: at.toISOString(), ml }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteWater(id: string): Promise<void> {
  const { error } = await supabase.from('water_logs').delete().eq('id', id);
  if (error) throw error;
}

export async function saveHealthWater(rows: { external_id: string; logged_at: string; ml: number }[]): Promise<void> {
  if (!rows.length) return;
  const user_id = await userId();
  const { error } = await supabase
    .from('water_logs')
    .upsert(rows.map((r) => ({ ...r, user_id, source: 'health' })), { onConflict: 'user_id,external_id' });
  if (error) throw error;
}

// Workouts (from Health Connect) ----------------------------------------------------------------

export type Workout = { id: string; started_at: string; ended_at: string; exercise: number; title: string | null };

export async function listWorkouts(from: Date, to: Date): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, started_at, ended_at, exercise, title')
    .gte('started_at', startOfDay(from).toISOString())
    .lt('started_at', dayRange(to).end.toISOString())
    .order('started_at');
  if (error) throw error;
  return data as Workout[];
}

export async function saveHealthWorkouts(rows: { external_id: string; started_at: string; ended_at: string; exercise: number; title: string | null }[]): Promise<void> {
  if (!rows.length) return;
  const user_id = await userId();
  const { error } = await supabase
    .from('workouts')
    .upsert(rows.map((r) => ({ ...r, user_id, source: 'health' })), { onConflict: 'user_id,external_id' });
  if (error) throw error;
}

const EXERCISE_NAMES: Record<number, string> = {
  0: 'Workout', 2: 'Badminton', 8: 'Cycling', 9: 'Indoor cycling', 14: 'Cricket', 16: 'Dancing', 25: 'Elliptical',
  36: 'HIIT', 37: 'Hiking', 48: 'Pilates', 56: 'Running', 57: 'Treadmill', 64: 'Football', 70: 'Strength training',
  71: 'Stretching', 74: 'Swimming', 79: 'Walking', 81: 'Weightlifting', 83: 'Yoga',
};
export const workoutName = (w: Pick<Workout, 'exercise' | 'title'>) => w.title || EXERCISE_NAMES[w.exercise] || 'Workout';

/** Everything the body trackers need for one day (plus the 6 before it, for the week bars). */
export async function loadBodyWeek(day: Date) {
  const from = addDays(day, -6);
  const [steps, sleep, water, workouts] = await Promise.all([
    listSteps(from, day),
    listSleep(addDays(from, -1), day),
    listWater(from, day),
    listWorkouts(from, day).catch(() => []),
  ]);
  return { steps, sleep, water, workouts };
}
