import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Bars } from '@/components/ui/bars';
import { Button } from '@/components/ui/button';
import { Confetti } from '@/components/ui/confetti';
import { Group, Row } from '@/components/ui/group';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Screen, Section } from '@/components/ui/screen';
import { Stepper } from '@/components/ui/stepper';
import { Tap } from '@/components/ui/tap';
import { useToast } from '@/components/ui/toast';
import { WeekStrip } from '@/components/ui/week-strip';
import { Fonts, Hues, Radius, Spacing, Tints, Tracker } from '@/constants/theme';
import { useBody } from '@/hooks/use-body';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { addSleep, addWater, deleteSleep, deleteWater, glasses, setManualSteps, type SleepSession, workoutName } from '@/lib/api/body';
import { dayTotal, hourly, sleepMinutes, sleepWindow } from '@/lib/body';
import { addDays, formatDayLabel, isSameDay, localDateString } from '@/lib/day';
import { errorMessage } from '@/lib/errors';
import { formatMinutes } from '@/lib/format';
import { connectHealth, healthStatus, type HealthStatus, installHealthConnect, lastHealthSync, openHealthSettings, syncHealth } from '@/lib/health';
import { useProfile } from '@/lib/profile';
import { useThemeMode } from '@/lib/theme-mode';

function parseDay(param?: string) {
  if (!param) return new Date();
  const [y, m, d] = param.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date();
}

const clock = (minutes: number) => new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const narrow = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'narrow' });

export default function BodyScreen() {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const { twoUp } = useLayout();
  const toast = useToast();
  const { profile } = useProfile();
  const params = useLocalSearchParams<{ day?: string }>();
  const [day, setDay] = useState(() => parseDay(params.day));
  const { data, refetch } = useBody(day);
  const [burst, setBurst] = useState(0);

  const hues = Hues[scheme];
  const tints = Tints[scheme];
  const dayKey = localDateString(day);
  const week = Array.from({ length: 7 }, (_, i) => addDays(day, i - 6));
  const stepGoal = profile?.step_goal ?? 8000;
  const waterGoal = profile?.water_goal ?? 8;
  const sleepGoal = profile?.sleep_goal_minutes ?? 480;

  const steps = data?.steps ?? [];
  const sleep = data?.sleep ?? [];
  const water = data?.water ?? [];
  const workouts = data?.workouts ?? [];
  const todaySteps = dayTotal(steps, dayKey);
  const todayWater = water.filter((w) => localDateString(new Date(w.logged_at)) === dayKey);
  const lastNight = sleep.filter((s) => localDateString(new Date(s.ended_at)) === dayKey).at(-1);
  const slept = sleepMinutes(sleep, dayKey);

  const drunk = glasses(todayWater);

  async function drink() {
    try {
      const id = await addWater(day);
      await refetch();
      if (drunk + 1 === waterGoal) setBurst((b) => b + 1);
      toast('Glass of water added', { label: 'Undo', onPress: () => deleteWater(id).then(refetch) });
    } catch (err) {
      toast(errorMessage(err, 'Couldn’t add that.'));
    }
  }

  async function undrink() {
    // Only glasses tapped in here: Health Connect entries would just sync back.
    const last = todayWater.filter((w) => w.source === 'manual').at(-1);
    if (!last) return;
    await deleteWater(last.id);
    refetch();
  }

  const stepsCard = (
    <Section title="Steps">
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <View style={styles.headline}>
          <View style={styles.fill}>
            <ThemedText type="hero" style={styles.tabular}>
              {todaySteps.toLocaleString()}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {todaySteps >= stepGoal ? `Goal of ${stepGoal.toLocaleString()} reached` : `of ${stepGoal.toLocaleString()} steps`}
            </ThemedText>
          </View>
          <ProgressRing progress={todaySteps / stepGoal} size={64} stroke={8} color={hues[Tracker.steps]} track={theme.fog}>
            <Icon name="steps" size={22} color={hues[Tracker.steps]} weight="fill" />
          </ProgressRing>
        </View>
        {hourly(steps, dayKey).some(Boolean) && (
          <Bars
            values={hourly(steps, dayKey)}
            labels={Array.from({ length: 24 }, (_, h) => (h % 6 === 0 ? `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}` : ''))}
            color={hues[Tracker.steps]}
            height={56}
            label="Steps by hour"
          />
        )}
        <Bars
          values={week.map((d) => dayTotal(steps, localDateString(d)))}
          labels={week.map(narrow)}
          color={hues[Tracker.steps]}
          goal={stepGoal}
          highlight={6}
          label={`Steps, last 7 days: ${week.map((d) => dayTotal(steps, localDateString(d))).join(', ')}`}
        />
      </View>
      <StepsSource day={day} onSynced={refetch} manualTotal={steps.find((r) => r.day === dayKey && r.source === 'manual')?.count ?? 0} />
    </Section>
  );

  const sleepCard = (
    <Section title="Sleep">
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <View style={styles.headline}>
          <View style={styles.fill}>
            <ThemedText type={slept ? 'hero' : 'title'} themeColor={slept ? 'text' : 'textSecondary'} style={styles.tabular}>
              {slept ? formatMinutes(slept) : 'Not logged yet'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {lastNight ? `${time(lastNight.started_at)} to ${time(lastNight.ended_at)}` : `Log the night that ended ${isSameDay(day, new Date()) ? 'this morning' : 'on ' + formatDayLabel(day)}`}
            </ThemedText>
          </View>
          <ProgressRing progress={slept / sleepGoal} size={64} stroke={8} color={hues[Tracker.sleep]} track={theme.fog}>
            <Icon name="night" size={22} color={hues[Tracker.sleep]} weight="fill" />
          </ProgressRing>
        </View>
        <Bars
          values={week.map((d) => sleepMinutes(sleep, localDateString(d)) / 60)}
          labels={week.map(narrow)}
          color={hues[Tracker.sleep]}
          goal={sleepGoal / 60}
          highlight={6}
          label={`Hours slept, last 7 nights: ${week.map((d) => (sleepMinutes(sleep, localDateString(d)) / 60).toFixed(1)).join(', ')}`}
        />
      </View>
      <LogSleep day={day} onSaved={refetch} />
      <SleepList sessions={sleep} onChange={refetch} />
    </Section>
  );

  const waterCard = (
    <Section title="Water">
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Confetti burst={burst} />
        <View style={styles.headline}>
          <View style={styles.fill}>
            <ThemedText type="hero" style={styles.tabular}>
              {drunk}
              <ThemedText type="title" themeColor="textTertiary">
                /{waterGoal}
              </ThemedText>
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              glasses, 250 ml each
            </ThemedText>
          </View>
          <View style={styles.waterButtons}>
            <IconButton icon="minus" label="Remove a glass" disabled={!todayWater.some((w) => w.source === 'manual')} onPress={undrink} />
            <Tap onPress={drink} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Add a glass of water" style={[styles.addGlass, { backgroundColor: hues[Tracker.water] }]}>
              <Icon name="add" size={22} color="#FFFFFF" weight="bold" />
            </Tap>
          </View>
        </View>
        <View style={styles.glasses} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {Array.from({ length: Math.max(waterGoal, drunk) }, (_, i) => (
            <Icon key={i} name="water" size={26} color={i < drunk ? hues[Tracker.water] : tints[Tracker.water]} weight="fill" />
          ))}
        </View>
        <Bars
          values={week.map((d) => glasses(water.filter((w) => localDateString(new Date(w.logged_at)) === localDateString(d))))}
          labels={week.map(narrow)}
          color={hues[Tracker.water]}
          goal={waterGoal}
          highlight={6}
          height={64}
          label="Glasses of water, last 7 days"
        />
      </View>
    </Section>
  );

  const dayWorkouts = workouts.filter((w) => localDateString(new Date(w.started_at)) === dayKey);
  const workoutCard = (
    <Section title="Workouts">
      {dayWorkouts.length ? (
        <Group>
          {dayWorkouts.map((w) => (
            <Row
              key={w.id}
              title={workoutName(w)}
              subtitle={`${time(w.started_at)} to ${time(w.ended_at)}, ${formatMinutes((+new Date(w.ended_at) - +new Date(w.started_at)) / 60000)}`}
              leading={<Icon name="workout" size={22} color={hues[Tracker.steps]} weight="duotone" />}
            />
          ))}
        </Group>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Workouts you record in Samsung Health, Google Fit or on a watch appear here through Health Connect, and can tick a workout habit for you.
        </ThemedText>
      )}
    </Section>
  );

  return (
    <Screen back title="Body" subtitle="Steps, sleep, water and workouts">
      <WeekStrip day={day} onChange={setDay} />
      {twoUp ? (
        <View style={styles.twoUp}>
          <View style={styles.half}>
            {stepsCard}
            {waterCard}
          </View>
          <View style={styles.half}>
            {sleepCard}
            {workoutCard}
          </View>
        </View>
      ) : (
        <>
          {stepsCard}
          {sleepCard}
          {waterCard}
          {workoutCard}
        </>
      )}
    </Screen>
  );
}

/** Where steps come from: Health Connect on Android, a typed-in total everywhere else. */
function StepsSource({ day, onSynced, manualTotal }: { day: Date; onSynced: () => void; manualTotal: number }) {
  const theme = useTheme();
  const toast = useToast();
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [last, setLast] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    healthStatus().then(setStatus).catch(() => setStatus('unsupported'));
    lastHealthSync().then(setLast).catch(() => {});
  }, []);

  async function connect() {
    setBusy(true);
    try {
      const ok = await connectHealth();
      setStatus(ok ? 'on' : 'off');
      if (ok && (await syncHealth({ force: true }))) {
        setLast(new Date());
        onSynced();
      }
      if (!ok) toast('Steps weren’t allowed. You can change that in Health Connect.');
    } catch (err) {
      toast(errorMessage(err, 'Couldn’t reach Health Connect.'));
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    setBusy(true);
    try {
      await syncHealth({ force: true });
      setLast(new Date());
      onSynced();
    } catch (err) {
      toast(errorMessage(err, 'Couldn’t sync from Health Connect.'));
    } finally {
      setBusy(false);
    }
  }

  async function saveTyped() {
    const n = Number(typed.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(n)) return;
    setBusy(true);
    try {
      await setManualSteps(day, n);
      setTyped('');
      onSynced();
      toast(n ? `Saved ${n.toLocaleString()} steps` : 'Cleared the typed total');
    } catch (err) {
      toast(errorMessage(err, 'Couldn’t save that.'));
    } finally {
      setBusy(false);
    }
  }

  if (status === null) return null;

  if (status === 'on') {
    return (
      <Group>
        <Row
          title="Health Connect"
          subtitle={last ? `Synced at ${last.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : 'Connected'}
          leading={<Icon name="health" size={20} color={theme.accent} weight="fill" />}
          trailing={<IconButton icon="sync" label="Sync now" variant="bare" disabled={busy} onPress={sync} />}
        />
        <Row title="Manage permissions" chevron onPress={openHealthSettings} />
      </Group>
    );
  }

  if (status === 'off' || status === 'needs-install') {
    return (
      <View style={[styles.note, { backgroundColor: theme.surface }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Your phone already counts steps, sleep, water and workouts in Health Connect (with Samsung Health, Google Fit or a watch). Connect it and they fill in by themselves, and can tick habits for you. Nothing is written back.
        </ThemedText>
        {status === 'off' ? (
          <Button label="Connect Health Connect" icon="health" onPress={connect} loading={busy} />
        ) : (
          <Button label="Install Health Connect" icon="download" variant="secondary" onPress={installHealthConnect} />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.note, { backgroundColor: theme.surface }]}>
      <ThemedText type="small" themeColor="textSecondary">
        Steps sync from the Android app. Here, you can type the day’s total from your phone or watch.
      </ThemedText>
      <View style={[styles.inputRow, { backgroundColor: theme.fog }]}>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          placeholder={manualTotal ? manualTotal.toLocaleString() : 'Steps today'}
          placeholderTextColor={theme.textTertiary}
          keyboardType="number-pad"
          inputMode="numeric"
          accessibilityLabel="Steps for the day"
          onSubmitEditing={saveTyped}
          maxLength={7}
          style={[styles.input, { color: theme.text }]}
        />
        <Button label="Save" compact onPress={saveTyped} loading={busy} disabled={!typed.trim()} />
      </View>
    </View>
  );
}

/** Bedtime and wake time as steppers; the night is saved against the morning you woke up. */
function LogSleep({ day, onSaved }: { day: Date; onSaved: () => void }) {
  const theme = useTheme();
  const toast = useToast();
  const [bed, setBed] = useState(23 * 60);
  const [wake, setWake] = useState(7 * 60);
  const [busy, setBusy] = useState(false);
  const { start, end } = sleepWindow(day, bed, wake);
  const length = Math.round((+end - +start) / 60000);

  async function save() {
    setBusy(true);
    try {
      await addSleep(start, end);
      onSaved();
      toast(`Saved ${formatMinutes(length)} of sleep`);
    } catch (err) {
      toast(errorMessage(err, 'Couldn’t save that night.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.note, { backgroundColor: theme.surface }]}>
      <View style={styles.stepRow}>
        <ThemedText type="body" style={styles.fill}>
          Went to bed
        </ThemedText>
        <Stepper label="Bedtime" value={bed} onChange={setBed} step={15} min={0} max={1440} wrap format={clock} />
      </View>
      <View style={styles.stepRow}>
        <ThemedText type="body" style={styles.fill}>
          Woke up
        </ThemedText>
        <Stepper label="Wake time" value={wake} onChange={setWake} step={15} min={0} max={1440} wrap format={clock} />
      </View>
      <Button label={`Save ${formatMinutes(length)} of sleep`} icon="night" variant="secondary" onPress={save} loading={busy} />
    </View>
  );
}

function SleepList({ sessions, onChange }: { sessions: SleepSession[]; onChange: () => void }) {
  const theme = useTheme();
  const toast = useToast();
  if (!sessions.length) return null;

  async function remove(s: SleepSession) {
    await deleteSleep(s.id);
    onChange();
    toast('Night removed', { label: 'Undo', onPress: () => addSleep(new Date(s.started_at), new Date(s.ended_at)).then(onChange) });
  }

  return (
    <Group>
      {[...sessions].reverse().slice(0, 7).map((s) => {
        const mins = Math.round((+new Date(s.ended_at) - +new Date(s.started_at)) / 60000);
        return (
          <Row
            key={s.id}
            title={`${formatMinutes(mins)}, woke ${new Date(s.ended_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`}
            subtitle={`${time(s.started_at)} to ${time(s.ended_at)}${s.source === 'health' ? ', from Health Connect' : ''}`}
            trailing={
              s.source === 'manual' ? <IconButton icon="trash" label="Delete this night" variant="bare" color={theme.textTertiary} size={17} onPress={() => remove(s)} /> : undefined
            }
          />
        );
      })}
    </Group>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  twoUp: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.four },
  half: { flex: 1, minWidth: 0, gap: Spacing.four },
  card: { borderRadius: Radius.large, padding: Spacing.three, gap: Spacing.three, overflow: 'hidden' },
  headline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  note: { borderRadius: Radius.large, padding: Spacing.three, gap: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Radius.medium, paddingLeft: Spacing.three, padding: 5 },
  input: { flex: 1, minHeight: 44, fontSize: 17, fontFamily: Fonts.regular },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  waterButtons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  addGlass: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  glasses: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
