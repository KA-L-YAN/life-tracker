import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { errorMessage } from '@/lib/errors';

/**
 * Loading/error/refetch for the per-screen lists. Refetches whenever the screen
 * regains focus (so the quick-add sheet's changes show up) and whenever the
 * memoized `fetcher` changes. Pass `useCallback(() => fn(dep), [dep])`.
 */
export function useAsyncData<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  const refetch = useCallback(async () => {
    const call = ++latest.current;
    setError(null);
    try {
      const result = await fetcher();
      // Ignore responses from calls that a newer one has superseded (fast day switching).
      if (call === latest.current) setData(result);
    } catch (err) {
      if (call === latest.current) setError(errorMessage(err));
    } finally {
      if (call === latest.current) setIsLoading(false);
    }
  }, [fetcher]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  return { data, isLoading, error, refetch };
}
