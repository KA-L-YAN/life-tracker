import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { insertLocationPoints, toLocationPoint } from '@/lib/api/location';
import { BACKGROUND_LOCATION_OPTIONS, LOCATION_TASK_NAME } from '@/lib/location/config';

export type PermissionResult = 'granted' | 'foreground-only' | 'denied';

/** Android/iOS native: two-step prompt (foreground, then background-"Always"). */
export async function requestLocationPermissions(): Promise<PermissionResult> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return 'denied';
  if (Platform.OS === 'web') return 'foreground-only';
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.granted ? 'granted' : 'foreground-only';
}

export async function isBackgroundTrackingActive(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}

export async function startBackgroundTracking(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, BACKGROUND_LOCATION_OPTIONS);
}

export async function stopBackgroundTracking(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

/**
 * Foreground point capture — used for the manual "log a point now" action on
 * every platform, and as iOS/web's entire tracking strategy (no background
 * execution exists in a closed Safari tab, so this runs on every app open instead).
 */
export async function captureCurrentLocation(): Promise<void> {
  const { granted } = await Location.getForegroundPermissionsAsync();
  if (!granted) {
    const result = await Location.requestForegroundPermissionsAsync();
    if (!result.granted) {
      throw new Error(
        Platform.OS === 'web'
          ? 'Location is blocked for this site. Allow it from the lock icon in the address bar, then try again.'
          : 'Location access is off. Turn it on for Life Tracker in your phone settings, then try again.',
      );
    }
  }
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  await insertLocationPoints([
    toLocationPoint(new Date(position.timestamp), position.coords.latitude, position.coords.longitude, position.coords.accuracy),
  ]);
}

let lastCaptureAt = 0;

/** Capture-on-open for web/iOS PWA, at most once per `minutes` per session. Never prompts twice if denied. */
export async function captureIfStale(minutes = 15): Promise<boolean> {
  if (Date.now() - lastCaptureAt < minutes * 60 * 1000) return false;
  lastCaptureAt = Date.now();
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status === 'denied') return false;
  await captureCurrentLocation();
  return true;
}
