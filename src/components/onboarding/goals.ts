import type { BlobShape } from '@/components/ui/blob';
import type { TileColor } from '@/constants/theme';
import type { Goal } from '@/lib/api/profile';

export const GOALS: { key: Goal; title: string; line: string; tile: TileColor; shape: BlobShape }[] = [
  { key: 'food', title: 'Eat mindfully', line: 'Notice what’s on the plate', tile: 'butter', shape: 'cloud' },
  { key: 'quit', title: 'Break a habit', line: 'Fewer slips, week by week', tile: 'bubblegum', shape: 'flower' },
  { key: 'build', title: 'Build good habits', line: 'Small wins every day', tile: 'lime', shape: 'round' },
  { key: 'focus', title: 'Study every day', line: 'Protect deep-work time', tile: 'periwinkle', shape: 'bean' },
  { key: 'move', title: 'Move more', line: 'See where your days go', tile: 'mint', shape: 'drop' },
  { key: 'other', title: 'Something else', line: 'Just keep track', tile: 'lilac', shape: 'round' },
];

export const FOCUS_OPTIONS = [
  { minutes: 15, line: 'A quick daily review' },
  { minutes: 30, line: 'One focused block' },
  { minutes: 60, line: 'An hour of deep work' },
  { minutes: 90, line: 'A serious study day' },
  { minutes: 120, line: 'Exam season' },
];

export const TIME_OPTIONS = ['06:30', '07:00', '07:30', '08:00', '09:00', '20:00', '21:30'];

/** Mon-first display order for weekday circles; values are JS weekdays (0 = Sunday). */
export const WEEK_ORDER = [
  { day: 1, letter: 'M' },
  { day: 2, letter: 'T' },
  { day: 3, letter: 'W' },
  { day: 4, letter: 'T' },
  { day: 5, letter: 'F' },
  { day: 6, letter: 'S' },
  { day: 0, letter: 'S' },
];
