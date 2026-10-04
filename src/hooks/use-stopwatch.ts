import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { addStudySession } from '@/lib/api/study';
import { clearStopwatch, readStopwatchState, startStopwatch } from '@/lib/stopwatch/persistence';

/**
 * Elapsed time is always recomputed as Date.now() - startedAt, never accumulated
 * by the tick interval — so a killed app or reloaded page resumes correctly
 * instead of losing or drifting the in-progress session.
 */
export function useStopwatch() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const isRunning = startedAt !== null;

  const sync = useCallback(async () => {
    const state = await readStopwatchState();
    setStartedAt(state.status === 'running' ? state.startedAt : null);
    setTopic(state.topic);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial read of persisted stopwatch state on mount
    sync();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') sync();
    });
    return () => sub.remove();
  }, [sync]);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [isRunning]);

  const start = useCallback(async (nextTopic: string | null) => {
    const state = await startStopwatch(nextTopic);
    setStartedAt(state.startedAt);
    setTopic(nextTopic);
    setNow(Date.now());
  }, []);

  const stop = useCallback(async () => {
    if (startedAt === null) return;
    await addStudySession(new Date(startedAt), new Date(), topic);
    await clearStopwatch();
    setStartedAt(null);
    setTopic(null);
  }, [startedAt, topic]);

  return { isRunning, elapsedMs: startedAt !== null ? Math.max(0, now - startedAt) : 0, topic, start, stop };
}
