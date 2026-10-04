import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { useAsyncData } from '@/hooks/use-async-data';
import { loadBodyWeek } from '@/lib/api/body';
import { syncHealth } from '@/lib/health';

/**
 * Steps, sleep and water for the week ending on `day`. On Android it first copies fresh data from
 * Health Connect (at most every 10 minutes) whenever the screen or the app comes back into view.
 */
export function useBody(day: Date) {
  const fetcher = useCallback(() => loadBodyWeek(day), [day]);
  const query = useAsyncData(fetcher);
  const { refetch } = query;

  const pull = useCallback(() => {
    syncHealth()
      .then((synced) => {
        if (synced) refetch();
      })
      .catch(() => {});
  }, [refetch]);

  useFocusEffect(pull);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') pull();
    });
    return () => sub.remove();
  }, [pull]);

  return query;
}
