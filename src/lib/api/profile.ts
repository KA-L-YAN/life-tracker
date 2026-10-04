import { supabase } from '@/lib/supabase';

export type Goal = 'food' | 'quit' | 'build' | 'focus' | 'move' | 'other';

export type Profile = {
  user_id: string;
  display_name: string | null;
  goals: Goal[];
  focus_goal_minutes: number;
  /** "HH:MM", 24h. */
  reminder_time: string;
  /** JS weekday numbers, 0 = Sunday. */
  reminder_days: number[];
  reminders_enabled: boolean;
  onboarded_at: string | null;
  /** Daily goals (migration 007). */
  step_goal: number;
  water_goal: number;
  sleep_goal_minutes: number;
  /** Profile picture (migration 009); see lib/avatar. */
  avatar: unknown;
  /** Spotify playlist link or URI for focus sessions. */
  focus_playlist: string | null;
  focus_music_autoplay: boolean;
};

export type ProfileInput = Partial<Omit<Profile, 'user_id'>>;

export async function getProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(input: ProfileInput): Promise<Profile> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sign in again to save your plan.');
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ user_id: auth.user.id, ...input })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
