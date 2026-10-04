import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InstallBanner } from '@/components/install-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Blob, BlobColors } from '@/components/ui/blob';
import { Button } from '@/components/ui/button';
import { Mesh } from '@/components/ui/mesh';
import { Tap } from '@/components/ui/tap';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { PRIVACY_URL } from '@/constants/links';
import { Fonts, Motion, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { NO_ACCOUNT, resendSignUpCode, resetPasswordWithCode, sendPasswordResetCode, useSession, verifySignUpCode } from '@/lib/auth';

/** signIn/signUp take a password; verify (new account) and reset (forgotten password) take an emailed code. */
type Mode = 'signIn' | 'signUp' | 'verify' | 'forgot' | 'reset';

const COPY: Record<Mode, { title: string; line: (email: string) => string; action: string }> = {
  signIn: { title: 'Welcome back', line: () => 'Sign in to your private log.', action: 'Sign in' },
  signUp: {
    title: 'Start your log',
    line: () => 'Create an account. Everything you track stays visible only to you.',
    action: 'Create account',
  },
  verify: {
    title: 'Check your email',
    line: (email) => `We sent a code to ${email}. It can take a minute, and it sometimes lands in spam.`,
    action: 'Confirm email',
  },
  forgot: { title: 'Reset your password', line: () => 'Enter your email and we’ll send you a code.', action: 'Send code' },
  reset: {
    title: 'Choose a new password',
    line: (email) => `Enter the code we sent to ${email}, then your new password.`,
    action: 'Save and sign in',
  },
};

/** Codes are 6 digits by default; Supabase can be set up to 10. */
const MIN_CODE = 6;
const RESEND_SECONDS = 60;

// Supabase's raw messages, said the way the rest of the app talks.
function friendly(message: string) {
  const wait = message.match(/after (\d+) seconds/);
  if (wait) return `Wait ${wait[1]} seconds before asking for another code.`;
  const known: Record<string, string> = {
    'Invalid login credentials': 'That email and password don’t match. Check both and try again.',
    [NO_ACCOUNT]: 'We couldn’t find an account with that email. Check it, or create a new account.',
    'User already registered': 'That email already has an account. Sign in instead.',
    'Signups not allowed for this instance': 'New accounts are turned off for this app right now.',
    'Token has expired or is invalid': 'That code is wrong or has expired. Check it, or ask for a new one.',
    'Email rate limit exceeded': 'Too many emails just now. Wait a minute and try again.',
    'Error sending confirmation email': 'The email didn’t send. Try again in a minute.',
    'Error sending recovery email': 'The email didn’t send. Try again in a minute.',
  };
  return known[message] ?? message;
}

export default function LoginScreen() {
  const { signIn, signUp } = useSession();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Resend countdown: ticks down to zero, then stops.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const startCooldown = () => setSecondsLeft(RESEND_SECONDS);

  function go(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setCode('');
    if (next === 'reset') setPassword('');
  }

  const trimmed = email.trim();
  const needsEmail = mode === 'signIn' || mode === 'signUp' || mode === 'forgot';
  const needsPassword = mode === 'signIn' || mode === 'signUp' || mode === 'reset';
  const needsCode = mode === 'verify' || mode === 'reset';
  const newPassword = mode === 'signUp' || mode === 'reset';
  const canSubmit =
    (!needsEmail || trimmed.length > 0) &&
    (!needsPassword || (newPassword ? password.length >= 6 : password.length > 0)) &&
    (!needsCode || code.length >= MIN_CODE);

  async function submit() {
    if (!canSubmit || busy) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    let err: string | null = null;
    if (mode === 'signIn') {
      err = (await signIn(trimmed, password)).error;
      if (err === 'Email not confirmed') {
        go('verify');
        setNotice('This email isn’t confirmed yet. Enter the code we sent, or get a new one.');
        err = null;
      }
    } else if (mode === 'signUp') {
      const result = await signUp(trimmed, password);
      err = result.error;
      // With a session the route guard moves on to plan setup; without one, the code is on its way.
      if (!err && result.needsConfirmation) {
        go('verify');
        startCooldown();
      }
    } else if (mode === 'verify') {
      err = await verifySignUpCode(trimmed, code);
    } else if (mode === 'forgot') {
      err = await sendPasswordResetCode(trimmed);
      if (!err) {
        go('reset');
        startCooldown();
      }
    } else {
      err = await resetPasswordWithCode(trimmed, code, password);
    }
    setBusy(false);
    if (err) setError(friendly(err));
  }

  async function resend() {
    setError(null);
    setNotice(null);
    const err = mode === 'reset' ? await sendPasswordResetCode(trimmed) : await resendSignUpCode(trimmed);
    if (err) setError(friendly(err));
    else {
      setNotice('New code sent.');
      startCooldown();
    }
  }

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.fog }];
  const copy = COPY[mode];

  return (
    <ThemedView style={styles.fill}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView
          contentContainerStyle={[styles.column, { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.four }]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.toggleRow}>
            <ThemeToggle />
          </View>
          <InstallBanner />

          <View style={styles.hero}>
            <Mesh />
            <View style={[styles.blob, { top: '14%', left: '14%' }]}>
              <Blob shape="cloud" color={BlobColors.peach} size={58} mood="calm" />
            </View>
            <View style={[styles.blob, { top: '30%', left: '40%' }]}>
              <Blob shape="flower" color={BlobColors.bubblegum} size={96} mood={needsCode ? 'wow' : 'happy'} />
            </View>
            <View style={[styles.blob, { top: '56%', right: '14%' }]}>
              <Blob shape="drop" color={BlobColors.mint} size={52} mood="wow" />
            </View>
          </View>

          <MotiView key={mode} from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }} transition={Motion.settle} style={styles.copy}>
            <ThemedText type="hero">{copy.title}</ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              {copy.line(trimmed)}
            </ThemedText>
          </MotiView>

          <View style={styles.form}>
            {needsEmail && (
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                onSubmitEditing={mode === 'forgot' ? submit : undefined}
                style={inputStyle}
              />
            )}
            {needsCode && (
              <TextInput
                value={code}
                onChangeText={(text) => setCode(text.replace(/\D/g, ''))}
                placeholder="Code"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={10}
                autoFocus
                autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                textContentType="oneTimeCode"
                onSubmitEditing={mode === 'verify' ? submit : undefined}
                accessibilityLabel="Code from the email"
                style={[inputStyle, styles.code]}
              />
            )}
            {needsPassword && (
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'reset' ? 'New password (at least 6 characters)' : mode === 'signUp' ? 'Password (at least 6 characters)' : 'Password'}
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoComplete={newPassword ? 'new-password' : 'password'}
                textContentType={newPassword ? 'newPassword' : 'password'}
                onSubmitEditing={submit}
                returnKeyType="go"
                style={inputStyle}
              />
            )}
            {error && (
              <ThemedText type="small" color={theme.danger}>
                {error}
              </ThemedText>
            )}
            {notice && (
              <ThemedText type="small" themeColor="textSecondary">
                {notice}
              </ThemedText>
            )}
            <Button label={copy.action} onPress={submit} loading={busy} disabled={!canSubmit} />

            {mode === 'signIn' && (
              <>
                <Button label="Forgot password?" variant="quiet" onPress={() => go('forgot')} />
                <Button label="New here? Create an account" variant="quiet" onPress={() => go('signUp')} />
              </>
            )}
            {mode === 'signUp' && <Button label="I already have an account" variant="quiet" onPress={() => go('signIn')} />}
            {needsCode && (
              <Button
                label={secondsLeft > 0 ? `Send a new code in ${secondsLeft}s` : 'Send a new code'}
                variant="quiet"
                disabled={secondsLeft > 0}
                onPress={resend}
              />
            )}
            {mode === 'verify' && <Button label="Use a different email" variant="quiet" onPress={() => go('signUp')} />}
            {(mode === 'forgot' || mode === 'reset') && <Button label="Back to sign in" variant="quiet" onPress={() => go('signIn')} />}
            <Tap onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link" containerStyle={styles.privacy}>
              <ThemedText type="caption" themeColor="textSecondary">
                Privacy policy
              </ThemedText>
            </Tap>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: Spacing.four - 4, gap: Spacing.four },
  toggleRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  hero: { height: 280, borderRadius: Radius.sheet, overflow: 'hidden' },
  blob: { position: 'absolute' },
  copy: { gap: 4 },
  form: { gap: 12 },
  input: { minHeight: 54, borderRadius: Radius.medium, paddingHorizontal: Spacing.three, fontSize: 16, fontFamily: Fonts.medium },
  privacy: { alignSelf: 'center', padding: Spacing.two },
  code: { fontSize: 26, fontFamily: Fonts.bold, letterSpacing: 8, textAlign: 'center' },
});
