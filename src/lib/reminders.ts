import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type ReminderResult = 'scheduled' | 'off' | 'denied' | 'unsupported';

export const remindersSupported = true;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Replaces whatever was scheduled with one local nudge per chosen weekday. No server involved. */
export async function scheduleReminders(time: string, days: number[], enabled: boolean): Promise<ReminderResult> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled || days.length === 0) return 'off';

  let { granted } = await Notifications.getPermissionsAsync();
  if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return 'denied';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Daily check-in',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const [hour, minute] = time.split(':').map(Number);
  await Promise.all(
    days.map((day) =>
      Notifications.scheduleNotificationAsync({
        content: { title: 'Time for your check-in', body: 'Log your meals, tick off habits, start a focus session.' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day + 1, // expo: 1 = Sunday; ours: 0 = Sunday
          hour,
          minute,
          channelId: 'reminders',
        },
      }),
    ),
  );
  return 'scheduled';
}
