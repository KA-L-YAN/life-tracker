import type { AutoRule } from '@/lib/auto';
import { addDays, dayRange, startOfDay } from '@/lib/day';
import { pageAll, supabase } from '@/lib/supabase';

export type HabitKind = 'build' | 'quit';

export type Habit = {
  id: string;
  name: string;
  note: string | null;
  kind: HabitKind;
  icon: string;
  color: string;
  created_at: string;
  /** A rule that ticks the habit by itself (build habits only); see lib/auto. */
  auto: AutoRule | null;
};

export type HabitLog = { id: string; habit_id: string; logged_at: string };

export type HabitInput = Pick<Habit, 'name' | 'kind' | 'icon' | 'color'> & { note?: string | null; auto?: AutoRule | null };

export async function listHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('id, name, note, kind, icon, color, created_at, auto')
    .is('archived_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getHabit(id: string): Promise<Habit | null> {
  const { data, error } = await supabase
    .from('habits')
    .select('id, name, note, kind, icon, color, created_at, auto')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createHabit(input: HabitInput): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .insert(input)
    .select('id, name, note, kind, icon, color, created_at, auto')
    .single();
  if (error) throw error;
  return data;
}

export async function updateHabit(id: string, input: Partial<HabitInput>): Promise<void> {
  const { error } = await supabase.from('habits').update(input).eq('id', id);
  if (error) throw error;
}

/** Hides the habit but keeps its history. */
export async function archiveHabit(id: string): Promise<void> {
  const { error } = await supabase.from('habits').update({ archived_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function unarchiveHabit(id: string): Promise<void> {
  const { error } = await supabase.from('habits').update({ archived_at: null }).eq('id', id);
  if (error) throw error;
}

/** All logs (every habit) from `days` days ago up to now — enough for streaks and strips. */
export async function listRecentLogs(days: number, habitId?: string): Promise<HabitLog[]> {
  const since = startOfDay(addDays(new Date(), -(days - 1)));
  let query = supabase
    .from('habit_logs')
    .select('id, habit_id, logged_at')
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: false });
  if (habitId) query = query.eq('habit_id', habitId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Every log from `from` to now, paged (a year of habits is more than one response). */
export async function listLogsSince(from: Date): Promise<HabitLog[]> {
  return pageAll<HabitLog>((a, b) =>
    supabase.from('habit_logs').select('id, habit_id, logged_at').gte('logged_at', startOfDay(from).toISOString()).order('logged_at').range(a, b),
  );
}

export async function listLogsForHabit(habitId: string, limit = 60): Promise<HabitLog[]> {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('id, habit_id, logged_at')
    .eq('habit_id', habitId)
    .order('logged_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/** Most recent log ever — "days clean" for a quit habit reaches back past any window. */
export async function lastLogAt(habitId: string): Promise<string | null> {
  const logs = await listLogsForHabit(habitId, 1);
  return logs[0]?.logged_at ?? null;
}

/** Returns the new log's id so the caller can offer an undo. */
export async function addLog(habitId: string, at: Date = new Date()): Promise<string> {
  const { data, error } = await supabase
    .from('habit_logs')
    .insert({ habit_id: habitId, logged_at: at.toISOString() })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function deleteLog(id: string): Promise<void> {
  const { error } = await supabase.from('habit_logs').delete().eq('id', id);
  if (error) throw error;
}

/** Build habits: done-or-not for a given day. Returns the new state. */
export async function toggleDay(habitId: string, day: Date): Promise<boolean> {
  const { start, end } = dayRange(day);
  const { data, error } = await supabase
    .from('habit_logs')
    .select('id')
    .eq('habit_id', habitId)
    .gte('logged_at', start.toISOString())
    .lt('logged_at', end.toISOString());
  if (error) throw error;

  if (data.length > 0) {
    const { error: delError } = await supabase.from('habit_logs').delete().in('id', data.map((r) => r.id));
    if (delError) throw delError;
    return false;
  }
  // Past days get a midday timestamp so they land inside that local day regardless of time zone quirks.
  const isToday = startOfDay(day).getTime() === startOfDay(new Date()).getTime();
  const at = isToday ? new Date() : new Date(start.getTime() + 12 * 60 * 60 * 1000);
  await addLog(habitId, at);
  return true;
}
