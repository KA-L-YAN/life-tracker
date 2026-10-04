import { sleepMinutes } from './body.ts';
import { addDays, localDateString } from './day.ts';
import { formatMinutes } from './format.ts';
import { routeDistanceKm } from './geo.ts';

export type WeekInput = {
  /** Last day of the week being shown; the week before it is used for comparisons. */
  end: Date;
  habits: { id: string; kind: 'build' | 'quit'; created_at: string }[];
  logs: { habit_id: string; logged_at: string }[];
  sessions: { started_at: string; duration_seconds: number }[];
  meals: { logged_at: string }[];
  moods: { day: string; mood: number }[];
  points: { local_date: string; latitude: number; longitude: number }[];
  stepsDaily: { day: string; total: number }[];
  sleep: { started_at: string; ended_at: string }[];
  water: { logged_at: string; ml: number }[];
};

export type DayStat = {
  date: string;
  /** Share of build habits (that existed that day) ticked, 0..1; null with no habits. */
  habits: number | null;
  focus: number;
  meals: number;
  mood: number | null;
  km: number;
  steps: number;
  /** Minutes asleep in the night that ended this day. */
  sleep: number;
  /** Glasses of water. */
  water: number;
};

const localOf = (iso: string) => localDateString(new Date(iso));

/** 14 days, oldest first: [0..6] the week before, [7..13] the week shown. */
export function dailyStats(input: WeekInput): DayStat[] {
  return Array.from({ length: 14 }, (_, i) => {
    const date = localDateString(addDays(input.end, i - 13));
    const build = input.habits.filter((h) => h.kind === 'build' && localOf(h.created_at) <= date);
    const done = build.filter((h) => input.logs.some((l) => l.habit_id === h.id && localOf(l.logged_at) === date)).length;
    return {
      date,
      habits: build.length ? done / build.length : null,
      focus: input.sessions.filter((s) => localOf(s.started_at) === date).reduce((sum, s) => sum + s.duration_seconds, 0) / 60,
      meals: input.meals.filter((m) => localOf(m.logged_at) === date).length,
      mood: input.moods.find((m) => m.day === date)?.mood ?? null,
      km: routeDistanceKm(input.points.filter((p) => p.local_date === date)),
      steps: input.stepsDaily.find((d) => d.day === date)?.total ?? 0,
      sleep: sleepMinutes(input.sleep, date),
      water: Math.round(input.water.filter((w) => localOf(w.logged_at) === date).reduce((sum, w) => sum + w.ml, 0) / 250),
    };
  });
}

const MOOD_WORDS = ['', 'rough', 'low', 'okay', 'good', 'great'];
const weekday = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en', { weekday: 'long' });
};
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** A few plain sentences about the week, most useful first. Skips anything with no data. */
export function highlights(stats: DayStat[]): string[] {
  const prev = stats.slice(0, 7);
  const week = stats.slice(7);
  const out: string[] = [];

  const focus = sum(week.map((d) => d.focus));
  const focusBefore = sum(prev.map((d) => d.focus));
  if (focus > 0 || focusBefore > 0) {
    const diff = Math.round(focus - focusBefore);
    out.push(
      diff === 0
        ? `You focused for ${formatMinutes(focus)}, the same as the week before.`
        : `You focused for ${formatMinutes(focus)}, ${formatMinutes(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than the week before.`,
    );
  }

  const habitDays = week.filter((d) => d.habits !== null);
  if (habitDays.length) {
    const best = habitDays.reduce((a, b) => ((b.habits ?? 0) > (a.habits ?? 0) ? b : a));
    const avg = sum(habitDays.map((d) => d.habits ?? 0)) / habitDays.length;
    if ((best.habits ?? 0) > 0) {
      out.push(
        best.habits === 1
          ? `${weekday(best.date)} was your best habit day: every habit done. Across the week you hit ${Math.round(avg * 100)}%.`
          : `${weekday(best.date)} was your best habit day, at ${Math.round((best.habits ?? 0) * 100)}%. Across the week you hit ${Math.round(avg * 100)}%.`,
      );
    }
  }

  const nights = week.filter((d) => d.sleep > 0);
  if (nights.length) {
    out.push(`You slept ${formatMinutes(sum(nights.map((d) => d.sleep)) / nights.length)} a night on average, across ${nights.length} night${nights.length === 1 ? '' : 's'} logged.`);
  }

  const steps = sum(week.map((d) => d.steps));
  if (steps > 0) out.push(`You walked ${steps.toLocaleString()} steps, about ${Math.round(steps / 7).toLocaleString()} a day.`);

  const moods = week.filter((d) => d.mood !== null).map((d) => d.mood ?? 0);
  if (moods.length) {
    const avg = Math.round(sum(moods) / moods.length);
    out.push(`Your mood averaged ${MOOD_WORDS[avg]} across ${moods.length} check-in${moods.length === 1 ? '' : 's'}.`);
  }

  const meals = sum(week.map((d) => d.meals));
  const mealDays = week.filter((d) => d.meals > 0).length;
  if (meals > 0) out.push(`You logged ${meals} thing${meals === 1 ? '' : 's'} to eat on ${mealDays} day${mealDays === 1 ? '' : 's'}.`);

  const glasses = sum(week.map((d) => d.water));
  if (glasses > 0) out.push(`You drank ${glasses} glass${glasses === 1 ? '' : 'es'} of water.`);

  const km = sum(week.map((d) => d.km));
  const moved = week.filter((d) => d.km > 0.05).length;
  if (km >= 0.1) out.push(`You covered ${km.toFixed(1)} km across ${moved} day${moved === 1 ? '' : 's'}.`);

  return out;
}
