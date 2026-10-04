// Run: node --experimental-strip-types scripts/check-auto.ts
import assert from 'node:assert/strict';

import { describeRule, isAutoRule, metresBetween, ruleMet, ruleProgress } from '../src/lib/auto.ts';
import { usuals } from '../src/lib/food-usuals.ts';

const day = { steps: 8200, sleep: 400, water: 5, focus: 30, workout: 0, points: [{ latitude: 17.385, longitude: 78.4867 }] };

assert.equal(ruleMet({ kind: 'steps', target: 8000 }, day), true);
assert.equal(ruleMet({ kind: 'steps', target: 10000 }, day), false);
assert.equal(ruleMet({ kind: 'sleep', target: 420 }, day), false);
assert.equal(ruleMet({ kind: 'water', target: 5 }, day), true, 'exactly on target counts');
assert.equal(ruleMet({ kind: 'workout', target: 20 }, day), false);
assert.equal(ruleProgress({ kind: 'focus', target: 60 }, day), 0.5);

// Places: ~111 m per 0.001° of latitude.
assert.ok(Math.abs(metresBetween({ latitude: 17.385, longitude: 78.4867 }, { latitude: 17.386, longitude: 78.4867 }) - 111) < 2);
assert.equal(ruleMet({ kind: 'place', lat: 17.386, lng: 78.4867, radius: 150 }, day), true);
assert.equal(ruleMet({ kind: 'place', lat: 17.39, lng: 78.4867, radius: 150 }, day), false, '550 m away is not there');
assert.equal(ruleMet({ kind: 'place', lat: 17.386, lng: 78.4867, radius: 150 }, { ...day, points: [] }), false);

// Rules come from the database as JSON, so they are checked before use.
assert.equal(isAutoRule({ kind: 'steps', target: 8000 }), true);
assert.equal(isAutoRule({ kind: 'steps' }), false);
assert.equal(isAutoRule({ kind: 'teleport', target: 1 }), false);
assert.equal(isAutoRule({ kind: 'place', lat: 1, lng: 2, radius: 100 }), true);
assert.equal(isAutoRule(null), false);
assert.match(describeRule({ kind: 'sleep', target: 450 }), /7\.5 h/);

// Usuals: what you log most for a meal, newest spelling kept, one-offs left out.
const at = (d: number) => new Date(2026, 8, d, 8).toISOString();
const entries = [
  { note: 'Idli sambar', meal: 'breakfast' as const, logged_at: at(20) },
  { note: 'idli sambar ', meal: 'breakfast' as const, logged_at: at(22) },
  { note: 'Idli Sambar', meal: 'breakfast' as const, logged_at: at(25) },
  { note: 'Poha', meal: 'breakfast' as const, logged_at: at(21) },
  { note: 'Poha', meal: 'breakfast' as const, logged_at: at(23) },
  { note: 'Dosa', meal: 'breakfast' as const, logged_at: at(24) },
  { note: 'Poha', meal: 'lunch' as const, logged_at: at(24) },
];
assert.deepEqual(usuals(entries, 'breakfast'), ['Idli Sambar', 'Poha']);
assert.deepEqual(usuals(entries, 'dinner'), []);

console.log('auto + usuals ok');
