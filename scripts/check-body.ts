// Run: node --experimental-strip-types scripts/check-body.ts
import assert from 'node:assert/strict';

import { dayTotal, hourly, hourRows, sleepMinutes, sleepOnDay, sleepWindow } from '../src/lib/body.ts';

const local = (d: number, h: number, m = 0) => new Date(2026, 8, d, h, m).toISOString();

// Buckets land on the local hour they start in; empty buckets vanish; duplicates add up.
const rows = hourRows([
  { start: local(26, 8), count: 1200 },
  { start: local(26, 9), count: 0 },
  { start: local(26, 8), count: 300.4 },
  { start: local(25, 23), count: 40 },
]);
assert.deepEqual(
  rows.sort((a, b) => a.day.localeCompare(b.day)),
  [
    { day: '2026-09-25', hour: 23, count: 40 },
    { day: '2026-09-26', hour: 8, count: 1500 },
  ],
);

// Health data wins over a typed total; a typed total counts when there's nothing else.
const steps = [
  { day: '2026-09-26', hour: 8, source: 'health' as const, count: 1500 },
  { day: '2026-09-26', hour: 18, source: 'health' as const, count: 2500 },
  { day: '2026-09-26', hour: 0, source: 'manual' as const, count: 9000 },
  { day: '2026-09-25', hour: 0, source: 'manual' as const, count: 6000 },
];
assert.equal(dayTotal(steps, '2026-09-26'), 4000);
assert.equal(dayTotal(steps, '2026-09-25'), 6000);
assert.equal(dayTotal(steps, '2026-09-24'), 0);
const h = hourly(steps, '2026-09-26');
assert.equal(h.length, 24);
assert.equal(h[8] + h[18], 4000, 'typed totals never draw on the hour ring');
assert.equal(h[0], 0);

// A night from 23:30 to 07:00 belongs to the morning you wake up.
const night = { started_at: local(25, 23, 30), ended_at: local(26, 7) };
assert.equal(sleepMinutes([night], '2026-09-26'), 450);
assert.equal(sleepMinutes([night], '2026-09-25'), 0);
// On the dial it is split at midnight.
const parts = sleepOnDay([night], new Date(2026, 8, 26, 12));
assert.equal(parts.length, 1);
assert.equal(parts[0].start.getHours(), 0);
assert.equal(parts[0].end.getHours(), 7);
assert.equal(sleepOnDay([night], new Date(2026, 8, 25, 12))[0].start.getMinutes(), 30);

// Bed 23:15, wake 06:45 → the evening before; bed 01:00, wake 08:00 → same day.
const w = sleepWindow(new Date(2026, 8, 26, 15), 23 * 60 + 15, 6 * 60 + 45);
assert.equal(w.start.getDate(), 25);
assert.equal((+w.end - +w.start) / 60000, 450);
assert.equal(sleepWindow(new Date(2026, 8, 26), 60, 480).start.getDate(), 26);

console.log('body ok');
