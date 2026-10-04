import AsyncStorage from '@react-native-async-storage/async-storage';

import { glasses, listSleep, listSteps, listWater, listWorkouts } from '@/lib/api/body';
import { addLog, type Habit, listHabits, listLogsSince } from '@/lib/api/habits';
import { listLocationPointsBetween } from '@/lib/api/location';
import { listStudySessionsBetween } from '@/lib/api/study';
import { atPlace, type AutoRule, type DaySignals, isAutoRule, ruleMet } from '@/lib/auto';
import { dayTotal, sleepMinutes } from '@/lib/body';
import { addDays, dayRange, localDateString, startOfDay } from '@/lib/day';

const PLACES_KEY = 'auto:places';
const DONE_KEY = 'auto:done'; // habit#day pairs already ticked or dismissed, so nothing ticks twice

type PlaceHabit = { id: string; name: string; auto: Extract<AutoRule, { kind: 'place' }> };

async function readSet(key: string) {
  try {
    return new Set<string>(JSON.parse((await AsyncStorage.getItem(key)) ?? '[]'));
  } catch {
    return new Set<string>();
  }
}

async function remember(pairs: string[]) {
  const set = await readSet(DONE_KEY);
  pairs.forEach((p) => set.add(p));
  // Keep a few weeks: older pairs can never match again.
  const cutoff = localDateString(addDays(new Date(), -21));
  await AsyncStorage.setItem(DONE_KEY, JSON.stringify([...set].filter((p) => p.split('#')[1] >= cutoff)));
}

/** Untick an auto-habit by hand and it stays unticked for that day. */
export const dismissAuto = (habitId: string, day: Date) => remember([`${habitId}#${localDateString(day)}`]);

const minutes = (a: string, b: string) => (+new Date(b) - +new Date(a)) / 60000;

let running: Promise<string[]> | null = null;

/**
 * Ticks every build habit whose rule the data now meets, for yesterday and today (yesterday so a
 * late-night goal still counts). Returns the names it ticked. Safe to call often.
 */
export function runAutoHabits(): Promise<string[]> {
  running ??= run().finally(() => {
    running = null;
  });
  return running;
}

async function run(): Promise<string[]> {
  const habits = (await listHabits()).filter((h): h is Habit & { auto: AutoRule } => h.kind === 'build' && isAutoRule(h.auto));
  // The background location task reads this to tick place habits while the app is closed.
  await AsyncStorage.setItem(PLACES_KEY, JSON.stringify(habits.filter((h) => h.auto.kind === 'place').map((h) => ({ id: h.id, name: h.name, auto: h.auto }))));
  if (!habits.length) return [];

  const today = new Date();
  const yesterday = addDays(today, -1);
  const from = startOfDay(yesterday);
  const needs = (kind: AutoRule['kind']) => habits.some((h) => h.auto.kind === kind);
  const [logs, steps, sleep, water, sessions, workouts, points, done] = await Promise.all([
    listLogsSince(from),
    needs('steps') ? listSteps(yesterday, today) : [],
    needs('sleep') ? listSleep(addDays(yesterday, -1), today) : [],
    needs('water') ? listWater(yesterday, today) : [],
    needs('focus') ? listStudySessionsBetween(from, dayRange(today).end) : [],
    needs('workout') ? listWorkouts(yesterday, today).catch(() => []) : [],
    needs('place') ? listLocationPointsBetween(yesterday, today).catch(() => []) : [],
    readSet(DONE_KEY),
  ]);

  const ticked: string[] = [];
  const pairs: string[] = [];
  for (const day of [yesterday, today]) {
    const key = localDateString(day);
    const on = (iso: string) => localDateString(new Date(iso)) === key;
    const signals: DaySignals = {
      steps: dayTotal(steps, key),
      sleep: sleepMinutes(sleep, key),
      water: glasses(water.filter((w) => on(w.logged_at))),
      focus: sessions.filter((s) => on(s.started_at)).reduce((sum, s) => sum + s.duration_seconds / 60, 0),
      workout: workouts.filter((w) => on(w.started_at)).reduce((sum, w) => sum + minutes(w.started_at, w.ended_at), 0),
      points: points.filter((p) => p.local_date === key),
    };
    for (const h of habits) {
      const pair = `${h.id}#${key}`;
      if (done.has(pair) || logs.some((l) => l.habit_id === h.id && on(l.logged_at))) continue;
      if (!ruleMet(h.auto, signals)) continue;
      const isToday = key === localDateString(today);
      await addLog(h.id, isToday ? new Date() : new Date(startOfDay(day).getTime() + 12 * 3600000));
      pairs.push(pair);
      ticked.push(h.name);
    }
  }
  if (pairs.length) await remember(pairs);
  return ticked;
}

/**
 * Called from the background location task with the points it just saved: ticks any place habit
 * those points are at, with the app closed. Uses the list the app cached on its last run.
 */
export async function tickPlacesInBackground(points: { latitude: number; longitude: number; local_date: string }[]) {
  let places: PlaceHabit[] = [];
  try {
    places = JSON.parse((await AsyncStorage.getItem(PLACES_KEY)) ?? '[]');
  } catch {
    return;
  }
  if (!places.length || !points.length) return;
  const done = await readSet(DONE_KEY);
  const pairs: string[] = [];
  for (const place of places) {
    for (const day of new Set(points.map((p) => p.local_date))) {
      const pair = `${place.id}#${day}`;
      if (done.has(pair) || pairs.includes(pair)) continue;
      if (!atPlace(place.auto, points.filter((p) => p.local_date === day))) continue;
      await addLog(place.id);
      pairs.push(pair);
    }
  }
  if (pairs.length) await remember(pairs);
}
