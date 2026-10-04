import { localDateString } from '@/lib/day';
import { pageAll, supabase } from '@/lib/supabase';

export type LocationPoint = {
  id: number;
  recorded_at: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
};

export type NewLocationPoint = {
  recorded_at: string;
  latitude: number;
  longitude: number;
  accuracy_m?: number | null;
  local_date: string;
};

export async function insertLocationPoints(points: NewLocationPoint[]): Promise<void> {
  if (points.length === 0) return;
  const { error } = await supabase.from('location_points').insert(points);
  if (error) throw error;
}

export function toLocationPoint(recordedAt: Date, latitude: number, longitude: number, accuracyM?: number | null): NewLocationPoint {
  return {
    recorded_at: recordedAt.toISOString(),
    latitude,
    longitude,
    accuracy_m: accuracyM ?? null,
    local_date: localDateString(recordedAt),
  };
}

/** Most recent point ever — where to centre an empty map. */
export async function lastLocationPoint(): Promise<LocationPoint | null> {
  const { data, error } = await supabase
    .from('location_points')
    .select('id, recorded_at, latitude, longitude, accuracy_m')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type DatedPoint = LocationPoint & { local_date: string };

/** Points for whole days `from`..`to` (inclusive) — the weekly Insights. */
export async function listLocationPointsBetween(from: Date, to: Date): Promise<DatedPoint[]> {
  return pageAll<DatedPoint>((a, b) =>
    supabase
      .from('location_points')
      .select('id, recorded_at, latitude, longitude, accuracy_m, local_date')
      .gte('local_date', localDateString(from))
      .lte('local_date', localDateString(to))
      .order('recorded_at', { ascending: true })
      .range(a, b),
  );
}

export async function listLocationPointsForDay(day: Date): Promise<LocationPoint[]> {
  const { data, error } = await supabase
    .from('location_points')
    .select('id, recorded_at, latitude, longitude, accuracy_m')
    .eq('local_date', localDateString(day))
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return data;
}
