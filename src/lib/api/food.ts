import { dayRange } from '@/lib/day';
import { supabase } from '@/lib/supabase';

export type Meal = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export const MEALS: { key: Meal; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'snack', label: 'Snack' },
  { key: 'dinner', label: 'Dinner' },
];

/** Best guess for the meal being logged right now. */
export function mealForHour(hour: number): Meal {
  if (hour < 4) return 'snack'; // after-midnight eating isn't breakfast
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}

export type FoodEntry = {
  id: string;
  note: string;
  meal: Meal | null;
  logged_at: string;
};

export async function listFoodEntries(day: Date): Promise<FoodEntry[]> {
  const { start, end } = dayRange(day);
  return listFoodEntriesBetween(start, end);
}

/** Entries from `start` (inclusive) to `end` (exclusive) — the weekly Insights. */
export async function listFoodEntriesBetween(start: Date, end: Date): Promise<FoodEntry[]> {
  const { data, error } = await supabase
    .from('food_entries')
    .select('id, note, meal, logged_at')
    .gte('logged_at', start.toISOString())
    .lt('logged_at', end.toISOString())
    .order('logged_at', { ascending: true });
  if (error) throw error;
  return data;
}

/** Logging onto a past day stamps it at the meal's usual hour so it sorts sensibly. */
export async function addFoodEntry(note: string, meal: Meal, day: Date = new Date()): Promise<void> {
  const { start } = dayRange(day);
  const isToday = start.getTime() === dayRange(new Date()).start.getTime();
  const mealHour = { breakfast: 8, lunch: 13, snack: 16, dinner: 20 }[meal];
  const loggedAt = isToday ? new Date() : new Date(start.getTime() + mealHour * 60 * 60 * 1000);
  const { error } = await supabase.from('food_entries').insert({ note, meal, logged_at: loggedAt.toISOString() });
  if (error) throw error;
}

export async function deleteFoodEntry(id: string): Promise<void> {
  const { error } = await supabase.from('food_entries').delete().eq('id', id);
  if (error) throw error;
}

/** Puts a deleted entry back exactly as it was (the Undo on a delete). */
export async function restoreFoodEntry(entry: FoodEntry): Promise<void> {
  const { error } = await supabase.from('food_entries').insert({ note: entry.note, meal: entry.meal, logged_at: entry.logged_at });
  if (error) throw error;
}
