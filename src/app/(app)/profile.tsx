import { router } from 'expo-router';
import { MotiView } from 'moti';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { GOALS } from '@/components/onboarding/goals';
import { ThemedText } from '@/components/themed-text';
import { Blob, type BlobMood, type BlobShape } from '@/components/ui/blob';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Group, Row } from '@/components/ui/group';
import { Icon, IconBadge, type IconName } from '@/components/ui/icon';
import { Screen, Section } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Stepper } from '@/components/ui/stepper';
import { Tap } from '@/components/ui/tap';
import { useToast } from '@/components/ui/toast';
import { PRIVACY_URL } from '@/constants/links';
import { Fonts, Hues, Radius, Spacing, TILE_COLORS, Tints, type TileColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteAccount, useSession } from '@/lib/auth';
import { asAvatar, type Avatar as AvatarData, DEFAULT_AVATAR, pickPhoto, removePhoto } from '@/lib/avatar';
import { errorMessage } from '@/lib/errors';
import { describeDays, formatMinutes, formatTime12 } from '@/lib/format';
import { healthSupported } from '@/lib/health';
import { useProfile } from '@/lib/profile';
import { remindersSupported, scheduleReminders } from '@/lib/reminders';
import { type ThemeMode, useThemeMode } from '@/lib/theme-mode';

const MODES: { key: ThemeMode; label: string; icon: IconName }[] = [
  { key: 'light', label: 'Light', icon: 'sun' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
  { key: 'system', label: 'Auto', icon: 'sparkles' },
];

export default function ProfileScreen() {
  const theme = useTheme();
  const { mode, setMode, scheme } = useThemeMode();
  const { session, signOut } = useSession();
  const { profile, save } = useProfile();
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  const [editingPicture, setEditingPicture] = useState(false);

  if (!profile) return <Screen back title="You" />;

  const clock = formatTime12(profile.reminder_time);
  const avatar = asAvatar(profile.avatar);
  const badge = (icon: IconName, tile: TileColor) => <IconBadge name={icon} size={32} hue={Hues[scheme][tile]} tint={Tints[scheme][tile]} />;

  async function toggleReminders(enabled: boolean) {
    const result = await scheduleReminders(profile!.reminder_time, profile!.reminder_days, enabled);
    await save({ reminders_enabled: enabled && result !== 'denied' });
    setReminderNote(result === 'denied' ? 'Notifications are blocked. Allow them for Life Tracker in your phone settings.' : null);
  }

  return (
    <Screen back title="You">
      <View style={styles.identity}>
        <Tap onPress={() => setEditingPicture((v) => !v)} scaleTo={0.94} accessibilityRole="button" accessibilityLabel="Change profile picture">
          <Avatar avatar={avatar} size={72} />
          <View style={[styles.editBadge, { backgroundColor: theme.accent, borderColor: theme.background }]}>
            <Icon name="edit" size={12} color={theme.onAccent} weight="bold" />
          </View>
        </Tap>
        <View style={styles.fill}>
          <ThemedText type="title">{profile.display_name || 'You'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {session?.user.email}
          </ThemedText>
        </View>
      </View>
      {editingPicture && <PictureEditor avatar={avatar} onChange={(next) => save({ avatar: next })} />}

      <Section title="Your plan">
        <Group>
          <Row title={GOALS.filter((g) => profile.goals.includes(g.key)).map((g) => g.title).join(', ') || 'Just keeping track'} leading={badge('target', 'peach')} />
          <Row title={`${profile.focus_goal_minutes} minutes of focus a day`} leading={badge('focus', 'periwinkle')} />
          <Row
            title="Daily reminder"
            subtitle={remindersSupported ? (reminderNote ?? `${clock.time} ${clock.period}, ${describeDays(profile.reminder_days)}`) : 'Reminders arrive in the Android app.'}
            leading={badge('bell', 'butter')}
            trailing={
              remindersSupported && (
                <Switch
                  value={profile.reminders_enabled}
                  onValueChange={toggleReminders}
                  accessibilityLabel="Daily reminder"
                  trackColor={{ false: theme.fog, true: theme.accent }}
                  thumbColor="#FFFFFF"
                />
              )
            }
          />
          <Row title="Adjust my plan" titleColor={theme.accent} chevron onPress={() => router.push('/plan')} />
        </Group>
      </Section>

      <Section title="Daily goals">
        <Group>
          <GoalRow label="Steps" icon={badge('steps', 'peach')} value={profile.step_goal} step={500} min={1000} max={30000} format={(v) => v.toLocaleString()} onSave={(v) => save({ step_goal: v })} />
          <GoalRow label="Water" icon={badge('water', 'sky')} value={profile.water_goal} step={1} min={1} max={20} format={(v) => `${v} glasses`} onSave={(v) => save({ water_goal: v })} />
          <GoalRow label="Sleep" icon={badge('night', 'plum')} value={profile.sleep_goal_minutes} step={30} min={300} max={660} format={(v) => formatMinutes(v)} onSave={(v) => save({ sleep_goal_minutes: v })} />
          <Row title="Steps, sleep and water" subtitle={healthSupported ? 'Health Connect, and history' : 'History, and typing in steps'} chevron onPress={() => router.push('/body')} />
        </Group>
      </Section>

      <Section title="Appearance">
        <Segmented label="Appearance" value={mode} onChange={setMode} options={MODES} />
      </Section>

      <Group>
        <Row title="Your week" subtitle="Trends across everything you track" leading={badge('insights', 'sky')} chevron onPress={() => router.push('/insights')} />
      </Group>

      <Section title="Account">
        <Group>
          <Row title="Privacy policy" chevron onPress={() => Linking.openURL(PRIVACY_URL)} />
          <Row title="Sign out" onPress={signOut} />
        </Group>
        <DeleteAccount />
      </Section>
    </Screen>
  );
}

/** A goal with − and +. Saves after the last tap settles, so quick taps don't race each other. */
function GoalRow({ label, icon, value, step, min, max, format, onSave }: { label: string; icon: ReactNode; value: number; step: number; min: number; max: number; format: (v: number) => string; onSave: (v: number) => Promise<unknown> }) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  function change(v: number) {
    setLocal(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSave(v).catch(() => setLocal(value)), 600);
  }
  return <Row title={label} leading={icon} trailing={<Stepper label={`${label} goal`} value={local} onChange={change} step={step} min={min} max={max} format={format} />} />;
}

const SHAPES: BlobShape[] = ['round', 'cloud', 'flower', 'drop', 'bean'];
const FACES: { key: BlobMood; label: string }[] = [
  { key: 'happy', label: 'Happy' },
  { key: 'calm', label: 'Calm' },
  { key: 'wow', label: 'Excited' },
  { key: 'sleepy', label: 'Sleepy' },
];

type Buddy = Extract<AvatarData, { kind: 'buddy' }>;

/** A photo from your gallery or camera, or your buddy: shape, colour and face. */
function PictureEditor({ avatar, onChange }: { avatar: AvatarData; onChange: (a: AvatarData) => Promise<unknown> }) {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const isBuddy = avatar.kind === 'buddy';
  const buddy = (isBuddy ? avatar : DEFAULT_AVATAR) as Buddy;

  function setBuddy(patch: Partial<Buddy>) {
    // Switching back from a photo also deletes the photo file.
    if (avatar.kind === 'photo') removePhoto(avatar.path).catch(() => {});
    onChange({ ...buddy, ...patch, kind: 'buddy' }).catch((err) => toast(errorMessage(err, 'Couldn’t save that.')));
  }

  async function photo(source: 'library' | 'camera') {
    setBusy(true);
    try {
      const next = await pickPhoto(source, avatar);
      if (next) await onChange(next);
    } catch (err) {
      toast(errorMessage(err, 'Couldn’t use that photo.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.editor, { backgroundColor: theme.surface }]}>
      <View style={styles.photoButtons}>
        <View style={styles.fill}>
          <Button label="Choose photo" icon="image" variant="secondary" compact onPress={() => photo('library')} loading={busy} />
        </View>
        {Platform.OS !== 'web' && (
          <View style={styles.fill}>
            <Button label="Take photo" icon="camera" variant="secondary" compact onPress={() => photo('camera')} disabled={busy} />
          </View>
        )}
      </View>
      <ThemedText type="caption" themeColor="textTertiary">
        Or make your buddy
      </ThemedText>
      <View style={styles.pickRow}>
        {SHAPES.map((shape) => {
          const selected = isBuddy && buddy.shape === shape;
          return (
            <Tap
              key={shape}
              onPress={() => setBuddy({ shape })}
              scaleTo={0.9}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${shape} shape`}
              style={[styles.pick, { borderColor: selected ? theme.accent : 'transparent', backgroundColor: theme.fog }]}>
              <Blob shape={shape} color={Hues.dark[buddy.color]} mood={buddy.mood} size={36} />
            </Tap>
          );
        })}
      </View>
      <View style={styles.pickRow}>
        {TILE_COLORS.map((color) => {
          const selected = isBuddy && buddy.color === color;
          return (
            <Tap
              key={color}
              onPress={() => setBuddy({ color })}
              scaleTo={0.88}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={color}
              style={[styles.swatchRing, { borderColor: selected ? Hues[scheme][color] : 'transparent' }]}>
              <View style={[styles.swatch, { backgroundColor: Hues[scheme][color] }]} />
            </Tap>
          );
        })}
      </View>
      <View style={styles.pickRow}>
        {FACES.map((m) => (
          <Chip key={m.key} label={m.label} selected={isBuddy && buddy.mood === m.key} onPress={() => setBuddy({ mood: m.key })} />
        ))}
      </View>
    </View>
  );
}

/** Two deliberate steps: open the panel, then type "delete". Nothing is removed until the red button. */
function DeleteAccount() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    // On success the session ends and the route guard swaps this screen for sign-in.
    const err = await deleteAccount();
    if (err) {
      setError(`Your account wasn’t deleted: ${err}`);
      setBusy(false);
    }
  }

  if (!open) return <Button label="Delete account" variant="quiet" onPress={() => setOpen(true)} />;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 200 }}
      style={[styles.danger, { borderColor: theme.danger }]}>
      <ThemedText type="title">Delete your account?</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        This permanently deletes your meals, habits, focus sessions, routes and your sign-in. It can’t be undone.
      </ThemedText>
      <TextInput
        value={typed}
        onChangeText={setTyped}
        placeholder="Type delete to confirm"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Type delete to confirm"
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, { color: theme.text, backgroundColor: theme.surface }]}
      />
      {error && (
        <ThemedText type="small" color={theme.danger}>
          {error}
        </ThemedText>
      )}
      <Button label="Delete my account" variant="danger" loading={busy} disabled={typed.trim().toLowerCase() !== 'delete'} onPress={remove} />
      <Button label="Keep my account" variant="quiet" disabled={busy} onPress={() => setOpen(false)} />
    </MotiView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  editBadge: { position: 'absolute', right: -4, bottom: -4, width: 26, height: 26, borderRadius: 13, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  editor: { borderRadius: Radius.large, padding: Spacing.three, gap: 12 },
  photoButtons: { flexDirection: 'row', gap: Spacing.two },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pick: { width: 52, height: 52, borderRadius: 16, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  swatchRing: { width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 28, height: 28, borderRadius: 14 },
  danger: { borderWidth: 1.5, borderRadius: Radius.large, padding: Spacing.three, gap: 12 },
  input: { minHeight: 50, borderRadius: Radius.medium, paddingHorizontal: Spacing.three, fontSize: 16, fontFamily: Fonts.medium },
});
