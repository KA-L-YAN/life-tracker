import { localDateString } from '@/lib/day';
import { supabase } from '@/lib/supabase';

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export type Mood = { day: string; mood: MoodLevel; note: string | null; updated_at: string };

/** Label + icon per level; icons are mood1…mood5 in the icon map. */
export const MOODS: { level: MoodLevel; label: string }[] = [
  { level: 1, label: 'Rough' },
  { level: 2, label: 'Low' },
  { level: 3, label: 'Okay' },
  { level: 4, label: 'Good' },
  { level: 5, label: 'Great' },
];

const COLUMNS = 'day, mood, note, updated_at';

export async function getMood(day: Date): Promise<Mood | null> {
  const { data, error } = await supabase.from('moods').select(COLUMNS).eq('day', localDateString(day)).maybeSingle();
  if (error) throw error;
  return data as Mood | null;
}

/** One mood per day: checking in again replaces the day's answer (migration 006). */
export async function setMood(day: Date, mood: MoodLevel, note: string | null = null): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Sign in again to save your mood.');
  const { error } = await supabase
    .from('moods')
    .upsert({ user_id: userId, day: localDateString(day), mood, note, updated_at: new Date().toISOString() }, { onConflict: 'user_id,day' });
  if (error) throw error;
}

export async function listMoods(from: Date, to: Date): Promise<Mood[]> {
  const { data, error } = await supabase
    .from('moods')
    .select(COLUMNS)
    .gte('day', localDateString(from))
    .lte('day', localDateString(to))
    .order('day', { ascending: true });
  if (error) throw error;
  return data as Mood[];
}
