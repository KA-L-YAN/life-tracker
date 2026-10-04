import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'study_stopwatch_state';

export type StopwatchState = {
  status: 'idle' | 'running';
  startedAt: number | null; // epoch ms
  topic: string | null;
};

const IDLE: StopwatchState = { status: 'idle', startedAt: null, topic: null };

export async function readStopwatchState(): Promise<StopwatchState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return IDLE;
  try {
    return { ...IDLE, ...(JSON.parse(raw) as Partial<StopwatchState>) };
  } catch {
    return IDLE;
  }
}

export async function startStopwatch(topic: string | null): Promise<StopwatchState> {
  const state: StopwatchState = { status: 'running', startedAt: Date.now(), topic };
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
  return state;
}

export async function clearStopwatch(): Promise<StopwatchState> {
  await AsyncStorage.setItem(KEY, JSON.stringify(IDLE));
  return IDLE;
}
