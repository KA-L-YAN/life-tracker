import { addDays, dayRange, startOfDay } from '@/lib/day';
import { supabase } from '@/lib/supabase';

export type StudySession = {
  id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  topic: string | null;
};

const COLUMNS = 'id, started_at, ended_at, duration_seconds, topic';

export async function listStudySessions(day: Date): Promise<StudySession[]> {
  const { start, end } = dayRange(day);
  return listStudySessionsBetween(start, end);
}

/** Sessions for the 7 days ending on `day` — feeds the weekly bars. */
export async function listStudyWeek(day: Date): Promise<StudySession[]> {
  const end = dayRange(day).end;
  return listStudySessionsBetween(startOfDay(addDays(day, -6)), end);
}

export async function listStudySessionsBetween(start: Date, end: Date): Promise<StudySession[]> {
  const { data, error } = await supabase
    .from('study_sessions')
    .select(COLUMNS)
    .gte('started_at', start.toISOString())
    .lt('started_at', end.toISOString())
    .order('started_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addStudySession(startedAt: Date, endedAt: Date, topic?: string | null): Promise<void> {
  const duration_seconds = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
  const { error } = await supabase.from('study_sessions').insert({
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_seconds,
    topic: topic?.trim() || null,
  });
  if (error) throw error;
}

export async function deleteStudySession(id: string): Promise<void> {
  const { error } = await supabase.from('study_sessions').delete().eq('id', id);
  if (error) throw error;
}
