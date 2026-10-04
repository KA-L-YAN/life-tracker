import { addDays, localDateString } from '@/lib/day';
import { supabase } from '@/lib/supabase';

export type Todo = { id: string; title: string; due: string | null; done_at: string | null; created_at: string };

const COLUMNS = 'id, title, due, done_at, created_at';

/** Everything still open, plus what was finished in the last week (so Undo and "done" stay visible). */
export async function listTodos(): Promise<Todo[]> {
  const since = addDays(new Date(), -7).toISOString();
  const { data, error } = await supabase.from('todos').select(COLUMNS).or(`done_at.is.null,done_at.gte.${since}`).order('created_at');
  if (error) throw error;
  return data as Todo[];
}

export async function addTodo(title: string, due: Date | null): Promise<Todo> {
  const { data, error } = await supabase
    .from('todos')
    .insert({ title: title.trim(), due: due ? localDateString(due) : null })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as Todo;
}

export async function setTodoDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.from('todos').update({ done_at: done ? new Date().toISOString() : null }).eq('id', id);
  if (error) throw error;
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await supabase.from('todos').delete().eq('id', id);
  if (error) throw error;
}

/** Puts a deleted task back as it was (the Undo on a delete). */
export async function restoreTodo(todo: Todo): Promise<void> {
  const { error } = await supabase.from('todos').insert(todo);
  if (error) throw error;
}
