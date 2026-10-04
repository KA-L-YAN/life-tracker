export type ReminderResult = 'scheduled' | 'off' | 'denied' | 'unsupported';

/** Browser/PWA push needs a push server; reminders are an Android-app feature. */
export const remindersSupported = false;

export async function scheduleReminders(): Promise<ReminderResult> {
  return 'unsupported';
}
