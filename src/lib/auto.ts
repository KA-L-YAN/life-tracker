import { routeDistanceKm } from './geo.ts';

/**
 * Rules that tick a build habit without a tap. Each reads one signal the app already collects,
 * so "walk 8,000 steps" ticks from Health Connect, "go to the gym" from the route, and
 * "study an hour" from the focus timer.
 */
export type AutoRule =
  | { kind: 'steps'; target: number }
  | { kind: 'sleep'; target: number } // minutes
  | { kind: 'water'; target: number } // glasses
  | { kind: 'focus'; target: number } // minutes
  | { kind: 'workout'; target: number } // minutes of exercise
  | { kind: 'place'; lat: number; lng: number; radius: number };

export type AutoKind = AutoRule['kind'];

export type DaySignals = {
  steps: number;
  sleep: number;
  water: number;
  focus: number;
  workout: number;
  points: { latitude: number; longitude: number }[];
};

export function isAutoRule(v: unknown): v is AutoRule {
  if (!v || typeof v !== 'object' || !('kind' in v)) return false;
  const r = v as Record<string, unknown>;
  if (r.kind === 'place') return typeof r.lat === 'number' && typeof r.lng === 'number' && typeof r.radius === 'number';
  return ['steps', 'sleep', 'water', 'focus', 'workout'].includes(r.kind as string) && typeof r.target === 'number' && r.target > 0;
}

/** Metres between two coordinates. */
export function metresBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  return routeDistanceKm([a, b]) * 1000;
}

export function atPlace(rule: Extract<AutoRule, { kind: 'place' }>, points: DaySignals['points']) {
  const here = { latitude: rule.lat, longitude: rule.lng };
  return points.some((p) => metresBetween(p, here) <= rule.radius);
}

export function ruleMet(rule: AutoRule, day: DaySignals): boolean {
  switch (rule.kind) {
    case 'place':
      return atPlace(rule, day.points);
    default:
      return day[rule.kind] >= rule.target;
  }
}

/** Plain-language rule, e.g. "Ticks itself at 8,000 steps". */
export function describeRule(rule: AutoRule): string {
  switch (rule.kind) {
    case 'steps':
      return `Ticks itself at ${rule.target.toLocaleString()} steps`;
    case 'sleep':
      return `Ticks itself after ${rule.target / 60} h of sleep`;
    case 'water':
      return `Ticks itself at ${rule.target} glasses of water`;
    case 'focus':
      return `Ticks itself after ${rule.target} min of focus`;
    case 'workout':
      return `Ticks itself after a ${rule.target} min workout`;
    case 'place':
      return `Ticks itself when you're there (within ${rule.radius} m)`;
  }
}

/** How far along today is, 0..1 (places are all or nothing). */
export function ruleProgress(rule: AutoRule, day: DaySignals): number {
  if (rule.kind === 'place') return atPlace(rule, day.points) ? 1 : 0;
  return Math.min(1, day[rule.kind] / rule.target);
}

/** Short form for a habit row, e.g. "8,000 steps". */
export function shortRule(rule: AutoRule): string {
  switch (rule.kind) {
    case 'steps':
      return `${rule.target.toLocaleString()} steps`;
    case 'sleep':
      return `${rule.target / 60} h sleep`;
    case 'water':
      return `${rule.target} glasses`;
    case 'focus':
      return `${rule.target} min focus`;
    case 'workout':
      return `${rule.target} min workout`;
    case 'place':
      return 'when you get there';
  }
}
