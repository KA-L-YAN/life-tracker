import { useCallback } from 'react';

import { useAsyncData } from '@/hooks/use-async-data';
import { lastLocationPoint, listLocationPointsForDay, type LocationPoint } from '@/lib/api/location';

export type RouteDay = { points: LocationPoint[]; center: LocationPoint | null };

/** A day's points, plus the latest point ever so an empty day still shows a map of where you are. */
export function useRouteDay(day: Date) {
  const fetcher = useCallback(async (): Promise<RouteDay> => {
    const points = await listLocationPointsForDay(day);
    return { points, center: points.length > 0 ? null : await lastLocationPoint() };
  }, [day]);
  return useAsyncData(fetcher);
}
