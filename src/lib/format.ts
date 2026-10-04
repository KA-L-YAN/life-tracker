export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** "1 h 5 min", "42 min", "0 min" — for totals. */
export function formatMinutes(totalMinutes: number): string {
  const m = Math.round(totalMinutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 === 0 ? `${h} h` : `${h} h ${m % 60} min`;
}

/** Split for the big timer: { h, m, s } parts rendered at different sizes. */
export function clockParts(ms: number) {
  const total = Math.floor(ms / 1000);
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

/** "07:00" -> { time: "7:00", period: "AM" } */
export function formatTime12(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return { time: `${hour}:${String(m).padStart(2, '0')}`, period };
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** [1,2,3,4,5] -> "weekdays"; JS weekday numbers, 0 = Sunday. */
export function describeDays(days: number[]): string {
  const set = new Set(days);
  if (set.size === 7) return 'every day';
  if (set.size === 0) return 'no days';
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return 'weekdays';
  if (set.size === 2 && set.has(0) && set.has(6)) return 'weekends';
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => set.has(d)).map((d) => SHORT_DAYS[d]).join(', ');
}
