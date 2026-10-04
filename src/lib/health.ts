import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import {
  aggregateGroupByDuration,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import { saveHealthSleep, saveHealthSteps, saveHealthWater, saveHealthWorkouts } from '@/lib/api/body';
import { hourRows } from '@/lib/body';
import { addDays, startOfDay } from '@/lib/day';

/**
 * Steps, sleep, water and workouts come from Health Connect, Android's shared health store: whatever already counts
 * them (the phone itself, Samsung Health, Google Fit, a watch) writes there, and we read it. The
 * copy is synced to the account so the website and iPhone show the same numbers.
 */
export type HealthStatus = 'unsupported' | 'needs-install' | 'off' | 'on';

const ENABLED_KEY = 'health-connect:enabled';
const LAST_SYNC_KEY = 'health-connect:last-sync';
const SYNC_EVERY_MS = 10 * 60 * 1000;
const PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'Hydration' },
  { accessType: 'read', recordType: 'ExerciseSession' },
] as const;

export const healthSupported = Platform.OS === 'android';

export async function healthStatus(): Promise<HealthStatus> {
  if (!healthSupported) return 'unsupported';
  const sdk = await getSdkStatus();
  if (sdk === SdkAvailabilityStatus.SDK_UNAVAILABLE) return 'unsupported';
  if (sdk === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs-install';
  if ((await AsyncStorage.getItem(ENABLED_KEY)) !== '1') return 'off';
  await initialize();
  const granted = await getGrantedPermissions();
  return granted.some((p) => 'recordType' in p && p.recordType === 'Steps') ? 'on' : 'off';
}

/** Shows Health Connect's own permission sheet. True when steps were allowed. */
export async function connectHealth(): Promise<boolean> {
  await initialize();
  const granted = await requestPermission([...PERMISSIONS]);
  const ok = granted.some((p) => 'recordType' in p && p.recordType === 'Steps');
  await AsyncStorage.setItem(ENABLED_KEY, ok ? '1' : '0');
  if (ok) await AsyncStorage.removeItem(LAST_SYNC_KEY);
  return ok;
}

/** Stops syncing (the permission itself is revoked from Health Connect's settings). */
export async function disconnectHealth() {
  await AsyncStorage.setItem(ENABLED_KEY, '0');
}

export function openHealthSettings() {
  openHealthConnectSettings();
}

export function installHealthConnect() {
  Linking.openURL('market://details?id=com.google.android.apps.healthdata').catch(() =>
    Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata'),
  );
}

export async function lastHealthSync(): Promise<Date | null> {
  const at = await AsyncStorage.getItem(LAST_SYNC_KEY);
  return at ? new Date(Number(at)) : null;
}

/**
 * Copies the last `days` days of hourly steps, sleep, water and workouts to the account. Throttled to once
 * every 10 minutes unless forced. Returns false when there was nothing to do.
 */
export async function syncHealth({ force = false, days = 7 } = {}): Promise<boolean> {
  if ((await healthStatus()) !== 'on') return false;
  const last = await lastHealthSync();
  if (!force && last && Date.now() - last.getTime() < SYNC_EVERY_MS) return false;

  const now = new Date();
  const from = startOfDay(addDays(now, -(days - 1)));
  const buckets = await aggregateGroupByDuration({
    recordType: 'Steps',
    timeRangeFilter: { operator: 'between', startTime: from.toISOString(), endTime: now.toISOString() },
    timeRangeSlicer: { duration: 'HOURS', length: 1 },
  });
  await saveHealthSteps(hourRows(buckets.map((b) => ({ start: b.startTime, count: b.result.COUNT_TOTAL ?? 0 }))));

  // Nights that ended in the window, so last night's sleep is always included.
  const sleep = await readRecords('SleepSession', {
    timeRangeFilter: { operator: 'between', startTime: addDays(from, -1).toISOString(), endTime: now.toISOString() },
  });
  await saveHealthSleep(
    sleep.records
      .filter((r) => r.metadata?.id)
      .map((r) => ({ external_id: r.metadata!.id!, started_at: r.startTime, ended_at: r.endTime })),
  );

  // Water and workouts are optional permissions: skip quietly if they weren't granted.
  const range = { timeRangeFilter: { operator: 'between', startTime: from.toISOString(), endTime: now.toISOString() } } as const;
  const granted = new Set((await getGrantedPermissions()).map((p) => ('recordType' in p ? p.recordType : '')));
  if (granted.has('Hydration')) {
    const water = await readRecords('Hydration', range);
    await saveHealthWater(
      water.records
        .filter((r) => r.metadata?.id && r.volume?.inMilliliters > 0)
        .map((r) => ({ external_id: r.metadata!.id!, logged_at: r.startTime, ml: Math.round(r.volume.inMilliliters) })),
    );
  }
  if (granted.has('ExerciseSession')) {
    const workouts = await readRecords('ExerciseSession', range);
    await saveHealthWorkouts(
      workouts.records
        .filter((r) => r.metadata?.id)
        .map((r) => ({ external_id: r.metadata!.id!, started_at: r.startTime, ended_at: r.endTime, exercise: r.exerciseType, title: r.title?.slice(0, 120) || null })),
    );
  }

  await AsyncStorage.setItem(LAST_SYNC_KEY, String(now.getTime()));
  return true;
}
