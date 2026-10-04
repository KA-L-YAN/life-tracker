/** Local-calendar-day helpers, shared by every tracker's day view. Pure — no app imports. */

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function dayRange(date: Date) {
  const start = startOfDay(date);
  return { start, end: addDays(start, 1) };
}

/** Monday-based week containing `date`. */
export function startOfWeek(date: Date) {
  const start = startOfDay(date);
  return addDays(start, -((start.getDay() + 6) % 7));
}

/** YYYY-MM-DD for the device's local calendar day (built by hand; locale formats vary by engine). */
export function localDateString(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isSameDay(a: Date, b: Date) {
  return localDateString(a) === localDateString(b);
}

export function isFuture(date: Date) {
  return startOfDay(date) > startOfDay(new Date());
}

export function formatDayLabel(date: Date) {
  if (isSameDay(date, new Date())) return 'Today';
  if (isSameDay(date, addDays(new Date(), -1))) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return 'Still up,';
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}
