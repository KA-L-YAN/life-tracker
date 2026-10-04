// Run: node --experimental-strip-types scripts/check-todos.ts
import assert from 'node:assert/strict';

import { playlistRef } from '../src/lib/spotify-link.ts';
import { dueLabel, groupTodos } from '../src/lib/todos.ts';

const now = new Date(2026, 8, 26, 18); // Sat 26 Sep 2026
const t = (id: string, due: string | null, done_at: string | null = null, created_at = '2026-09-20T10:00:00Z') => ({ id, title: id, due, done_at, created_at });

const g = groupTodos(
  [
    t('late', '2026-09-24'),
    t('later', '2026-10-02'),
    t('today', '2026-09-26'),
    t('someday', null),
    t('done', '2026-09-26', '2026-09-26T09:00:00Z'),
    t('soon', '2026-09-27'),
    t('lateer', '2026-09-20'),
  ],
  now,
);
assert.deepEqual(g.overdue.map((x) => x.id), ['lateer', 'late'], 'oldest overdue first');
assert.deepEqual(g.today.map((x) => x.id), ['today']);
assert.deepEqual(g.upcoming.map((x) => x.id), ['soon', 'later']);
assert.deepEqual(g.someday.map((x) => x.id), ['someday']);
assert.deepEqual(g.done.map((x) => x.id), ['done'], 'done wins over its due date');

assert.equal(dueLabel('2026-09-26', now), 'Today');
assert.equal(dueLabel('2026-09-27', now), 'Tomorrow');
assert.match(dueLabel('2026-09-24', now) ?? '', /^Overdue since Thu/);
assert.equal(dueLabel(null, now), null);

// Spotify links in every shape people paste them.
assert.deepEqual(playlistRef('https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ?si=abc123'), { type: 'playlist', id: '37i9dQZF1DWZeKCadgRdKQ' });
assert.deepEqual(playlistRef('https://open.spotify.com/intl-en/album/4aawyAB9vmqN3uQ7FjRGTy'), { type: 'album', id: '4aawyAB9vmqN3uQ7FjRGTy' });
assert.deepEqual(playlistRef('spotify:playlist:37i9dQZF1DWZeKCadgRdKQ'), { type: 'playlist', id: '37i9dQZF1DWZeKCadgRdKQ' });
assert.equal(playlistRef('https://example.com/playlist/abc'), null);
assert.equal(playlistRef('not a link'), null);

console.log('todos + spotify ok');
