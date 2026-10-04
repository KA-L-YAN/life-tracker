import { addDays, localDateString } from './day.ts';

export type TodoLike = { id: string; title: string; due: string | null; done_at: string | null; created_at: string };

export type TodoGroups<T extends TodoLike> = { overdue: T[]; today: T[]; upcoming: T[]; someday: T[]; done: T[] };

/** Sorts tasks the way a day is lived: late first, then today, then later, then someday, then done. */
export function groupTodos<T extends TodoLike>(todos: T[], now = new Date()): TodoGroups<T> {
  const today = localDateString(now);
  const groups: TodoGroups<T> = { overdue: [], today: [], upcoming: [], someday: [], done: [] };
  for (const t of todos) {
    if (t.done_at) groups.done.push(t);
    else if (!t.due) groups.someday.push(t);
    else if (t.due < today) groups.overdue.push(t);
    else if (t.due === today) groups.today.push(t);
    else groups.upcoming.push(t);
  }
  const byDue = (a: T, b: T) => (a.due ?? '').localeCompare(b.due ?? '') || a.created_at.localeCompare(b.created_at);
  groups.overdue.sort(byDue);
  groups.today.sort(byDue);
  groups.upcoming.sort(byDue);
  groups.someday.sort((a, b) => a.created_at.localeCompare(b.created_at));
  groups.done.sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''));
  return groups;
}

/** "Today", "Tomorrow", "Overdue since Mon", "Thu 1 Oct", or nothing for someday. */
export function dueLabel(due: string | null, now = new Date()): string | null {
  if (!due) return null;
  const today = localDateString(now);
  if (due === today) return 'Today';
  if (due === localDateString(addDays(now, 1))) return 'Tomorrow';
  const [y, m, d] = due.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const short = date.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' });
  return due < today ? `Overdue since ${short}` : short;
}
