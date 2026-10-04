import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { toLocationPoint, insertLocationPoints } from '@/lib/api/location';
import { tickPlacesInBackground } from '@/lib/automation';
import { LOCATION_TASK_NAME } from '@/lib/location/config';

// Must run at top-level module scope (imported once from the root layout) so the
// task is registered before startLocationUpdatesAsync runs and survives JS reloads.
// No-op on web: there is no background task runtime for a browser tab.
if (Platform.OS !== 'web') {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) return;
    const { locations } = data as { locations: Location.LocationObject[] };
    const points = locations.map((loc) =>
      toLocationPoint(new Date(loc.timestamp), loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy)
    );
    try {
      await insertLocationPoints(points);
      // Arriving somewhere can tick a place habit ("go to the gym") without opening the app.
      await tickPlacesInBackground(points);
    } catch {
      // ponytail: best-effort — a dropped background insert isn't worth a retry queue here.
    }
  });
}
