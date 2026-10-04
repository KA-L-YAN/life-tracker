// Run: node --experimental-strip-types scripts/check-habit-stats.ts
import assert from 'node:assert/strict';

import { bestStreak, countsByDay, currentStreak, daysClean, logDays } from '../src/lib/habit-stats.ts';

const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h).toISOString();
const today = new Date(2026, 8, 23, 20); // Sep 23, 8pm local

const logs = [
  { habit_id: 'a', logged_at: at(2026, 9, 23) },
  { habit_id: 'a', logged_at: at(2026, 9, 22) },
  { habit_id: 'a', logged_at: at(2026, 9, 21) },
  { habit_id: 'a', logged_at: at(2026, 9, 18) },
  { habit_id: 'a', logged_at: at(2026, 9, 17) },
  { habit_id: 'a', logged_at: at(2026, 9, 16) },
  { habit_id: 'a', logged_at: at(2026, 9, 15) },
  { habit_id: 'b', logged_at: at(2026, 9, 22, 23) },
  { habit_id: 'b', logged_at: at(2026, 9, 22, 7) },
];

const a = logDays(logs, 'a');
assert.equal(currentStreak(a, today), 3, 'streak counts back from today');
assert.equal(bestStreak(a), 4, 'best run is Sep 15-18');

// Today not done yet: streak still counts through yesterday instead of dropping to 0.
const b = logDays(logs, 'b');
assert.equal(currentStreak(b, today), 1);

assert.equal(daysClean(at(2026, 9, 22, 23), at(2026, 1, 1), today), 1, 'slip late yesterday = 1 day clean');
assert.equal(daysClean(null, at(2026, 9, 13), today), 10, 'never slipped = days since start');

const counts = countsByDay(logs, 3, 'b', today);
assert.deepEqual(counts.map((c) => c.count), [0, 2, 0], 'two slips on the 22nd, oldest first');

// Month rollover.
assert.equal(bestStreak(new Set(['2026-08-31', '2026-09-01', '2026-09-02'])), 3);

console.log('habit-stats ok');
