import * as Location from 'expo-location';

export const LOCATION_TASK_NAME = 'background-location-task';

/** Routes older than this are deleted nightly by the database (supabase/migrations/005). Change both together. */
export const ROUTE_KEEP_DAYS = 30;

/** ponytail: fixed cadence, not adaptive to movement/battery — tune here if 5min/100m proves too sparse or too battery-hungry. */
export const BACKGROUND_LOCATION_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 5 * 60 * 1000,
  distanceInterval: 100,
  foregroundService: {
    notificationTitle: 'Tracking your day',
    notificationBody: 'Recording your route in the background',
  },
};
