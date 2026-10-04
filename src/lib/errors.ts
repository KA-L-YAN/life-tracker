/** Supabase errors are plain objects with a `message`, not Error instances — read either. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}
