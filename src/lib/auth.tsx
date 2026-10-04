import type { Session } from '@supabase/supabase-js';
import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';

import { removeAllPhotos } from '@/lib/avatar';
import { stopBackgroundTracking } from '@/lib/location/tracking';
import { scheduleReminders } from '@/lib/reminders';
import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** `needsConfirmation`: the account exists but waits on the emailed link before it can sign in. */
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string) {
    // No session back means Supabase's "Confirm email" is on; the new user lands in onboarding after confirming.
    const { data, error } = await supabase.auth.signUp({ email, password });
    // With email confirmation on, an existing email gets a look-alike reply with no identities and no email.
    if (!error && data.user?.identities?.length === 0) return { error: 'User already registered', needsConfirmation: false };
    return { error: error?.message ?? null, needsConfirmation: !error && !data.session };
  }

  async function signOut() {
    await stopDeviceJobs();
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * A signed-out phone can't save anything (every table is per-user), so stop what would keep trying:
 * background location and scheduled reminders. Best effort; sign-out must not fail on these.
 */
async function stopDeviceJobs() {
  await Promise.allSettled([stopBackgroundTracking(), scheduleReminders('00:00', [], false)]);
}

/** Permanently deletes the signed-in user's data and account (migration 003), then forgets the session. */
export async function deleteAccount() {
  // Files live outside the tables, so the profile photo goes first (best effort).
  await removeAllPhotos().catch(() => {});
  const { error } = await supabase.rpc('delete_my_account');
  if (error) return error.message;
  await stopDeviceJobs();
  // The account is gone server-side; only the local copy of the session is left to clear.
  await supabase.auth.signOut({ scope: 'local' });
  return null;
}

// Email-code steps. They need no React state: a successful verify fires onAuthStateChange above,
// and the route guard takes it from there. Each returns Supabase's error message, or null.

export async function verifySignUpCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
  return error?.message ?? null;
}

export async function resendSignUpCode(email: string) {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  return error?.message ?? null;
}

/** Returned by sendPasswordResetCode when the email has no account (Supabase alone would stay silent). */
export const NO_ACCOUNT = 'no-account';

export async function sendPasswordResetCode(email: string) {
  // migration 004. If the check itself fails, send anyway rather than block a real reset.
  const { data: exists, error: checkError } = await supabase.rpc('account_exists', { check_email: email });
  if (!checkError && exists === false) return NO_ACCOUNT;
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return error?.message ?? null;
}

/** The recovery code signs the user in; the new password is saved immediately after. */
export async function resetPasswordWithCode(email: string, token: string, password: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
  if (error) return error.message;
  const { error: updateError } = await supabase.auth.updateUser({ password });
  return updateError?.message ?? null;
}

export function useSession() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useSession must be used within AuthProvider');
  return ctx;
}
