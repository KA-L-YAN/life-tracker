// Run: node --experimental-strip-types scripts/check-insights.ts
import assert from 'node:assert/strict';

import { buddyNote, daySeed } from '../src/lib/buddy.ts';
import { dailyStats, highlights } from '../src/lib/insights.ts';

const at = (d: number, h = 9) => new Date(2026, 8, d, h).toISOString(); // September 2026, local
const end = new Date(2026, 8, 26, 20); // Saturday

const stats = dailyStats({
  end,
  habits: [
    { id: 'read', kind: 'build', created_at: at(1) },
    { id: 'run', kind: 'build', created_at: at(24) }, // only counts from the 24th
    { id: 'phone', kind: 'quit', created_at: at(1) },
  ],
  logs: [
    { habit_id: 'read', logged_at: at(22) },
    { habit_id: 'read', logged_at: at(24) },
    { habit_id: 'run', logged_at: at(24, 18) },
    { habit_id: 'phone', logged_at: at(25) }, // slips never count as done
  ],
  sessions: [
    { started_at: at(15), duration_seconds: 30 * 60 }, // week before
    { started_at: at(24), duration_seconds: 45 * 60 },
    { started_at: at(25), duration_seconds: 45 * 60 },
  ],
  meals: [{ logged_at: at(26, 8) }, { logged_at: at(26, 13) }, { logged_at: at(20) }],
  moods: [
    { day: '2026-09-24', mood: 4 },
    { day: '2026-09-25', mood: 5 },
  ],
  points: [
    { local_date: '2026-09-26', latitude: 17.385, longitude: 78.4867 },
    { local_date: '2026-09-26', latitude: 17.395, longitude: 78.4867 }, // ~1.1 km north
  ],
  stepsDaily: [
    { day: '2026-09-25', total: 7000 },
    { day: '2026-09-26', total: 7000 },
  ],
  sleep: [{ started_at: at(25, 23), ended_at: at(26, 7) }], // 8 h, counts for the 26th
  water: [{ logged_at: at(26, 10), ml: 250 }, { logged_at: at(26, 15), ml: 250 }],
});

assert.equal(stats.length, 14);
assert.equal(stats[0].date, '2026-09-13', 'oldest first, two weeks back');
assert.equal(stats[13].date, '2026-09-26');
const day = (date: string) => stats.find((s) => s.date === date)!;
assert.equal(day('2026-09-22').habits, 1, 'one build habit existed, and it was done');
assert.equal(day('2026-09-24').habits, 1, 'both done once the second habit exists');
assert.equal(day('2026-09-25').habits, 0, 'a slip is not a tick');
assert.equal(day('2026-09-26').meals, 2);
assert.ok(Math.abs(day('2026-09-26').km - 1.11) < 0.02, 'distance per day');
assert.equal(day('2026-09-26').sleep, 480, 'the night counts for the morning you woke');
assert.equal(day('2026-09-25').sleep, 0);
assert.equal(day('2026-09-26').water, 2);
assert.equal(day('2026-09-26').steps, 7000);

const lines = highlights(stats);
assert.match(lines[0], /1 h 30 min, 1 h more than the week before/);
assert.match(lines[1], /^Tuesday was your best habit day: every habit done/);
assert.match(lines.join(' '), /mood averaged great across 2 check-ins/i);
assert.match(lines.join(' '), /1\.1 km across 1 day\./);
assert.match(lines.join(' '), /slept 8 h a night on average, across 1 night logged/);
assert.match(lines.join(' '), /walked 14.000 steps, about 2.000 a day/);
assert.match(lines.join(' '), /drank 2 glasses of water/);

// An empty week says nothing rather than "0 min".
assert.deepEqual(highlights(dailyStats({ end, habits: [], logs: [], sessions: [], meals: [], moods: [], points: [], stepsDaily: [], sleep: [], water: [] })), []);

// Buddy: the most specific situation wins.
const base = { hour: 14, habitsDone: 0, habitsTotal: 3, slipsToday: 0, focusMinutes: 0, focusGoal: 60, meals: 1, mood: null, steps: 0, stepGoal: 8000, sleepMinutes: 480, water: 6, waterGoal: 8 };
assert.equal(buddyNote({ ...base, slipsToday: 1, habitsDone: 3 }, 1).mood, 'calm', 'a slip outranks a clean sweep');
assert.equal(buddyNote({ ...base, habitsDone: 3, focusMinutes: 60 }, 1).mood, 'wow');
assert.equal(buddyNote({ ...base, hour: 21, meals: 0 }, 1).text, buddyNote({ ...base, hour: 21, meals: 0 }, 1).text, 'same seed, same line');
assert.equal(daySeed(new Date(2026, 8, 26)), 20260926);
assert.equal(buddyNote({ ...base, hour: 8, sleepMinutes: 300 }, 1).mood, 'sleepy', 'a short night shows in the morning');
assert.equal(buddyNote({ ...base, hour: 15, sleepMinutes: 300 }, 1).mood, 'happy', '...but not by the afternoon');
assert.match(buddyNote({ ...base, steps: 9000 }, 1).text, /[Ss]tep/);
assert.equal(buddyNote({ ...base, water: 2 }, 1).text, 'Water check: 2 of 8 glasses so far.');

console.log('insights + buddy ok');
