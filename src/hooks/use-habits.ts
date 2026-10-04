import { useCallback } from 'react';

import { useAsyncData } from '@/hooks/use-async-data';
import { type Habit, type HabitLog, lastLogAt, listHabits, listRecentLogs } from '@/lib/api/habits';

export const LOG_WINDOW_DAYS = 60;

export type HabitsData = {
  habits: Habit[];
  logs: HabitLog[];
  /** Last slip per quit habit — looked up past the log window when needed. */
  lastSlip: Record<string, string | null>;
};

async function loadHabits(): Promise<HabitsData> {
  const [habits, logs] = await Promise.all([listHabits(), listRecentLogs(LOG_WINDOW_DAYS)]);
  const lastSlip: Record<string, string | null> = {};
  await Promise.all(
    habits
      .filter((h) => h.kind === 'quit')
      .map(async (h) => {
        const inWindow = logs.find((l) => l.habit_id === h.id); // logs are newest-first
        lastSlip[h.id] = inWindow ? inWindow.logged_at : await lastLogAt(h.id);
      }),
  );
  return { habits, logs, lastSlip };
}

export function useHabits() {
  const fetcher = useCallback(() => loadHabits(), []);
  return useAsyncData(fetcher);
}
