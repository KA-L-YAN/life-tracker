import { MotiView } from 'moti';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FOCUS_OPTIONS, GOALS, TIME_OPTIONS, WEEK_ORDER } from '@/components/onboarding/goals';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Blob, BlobColors } from '@/components/ui/blob';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Mesh } from '@/components/ui/mesh';
import { goBack } from '@/components/ui/screen';
import { Tap } from '@/components/ui/tap';
import { ContentWidth, Fonts, Motion, Radius, Spacing, Tints } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createHabit, listHabits } from '@/lib/api/habits';
import type { Goal } from '@/lib/api/profile';
import { describeDays, formatTime12 } from '@/lib/format';
import { useProfile } from '@/lib/profile';
import { remindersSupported, scheduleReminders } from '@/lib/reminders';
import { useThemeMode } from '@/lib/theme-mode';
import { errorMessage } from '@/lib/errors';

type Step = 'welcome' | 'name' | 'goals' | 'time' | 'nudge' | 'ready';
const SETUP: Step[] = ['welcome', 'name', 'goals', 'time', 'nudge', 'ready'];
const EDIT: Step[] = ['name', 'goals', 'time', 'nudge', 'ready'];
const COUNTED: Step[] = ['name', 'goals', 'time', 'nudge'];

export function PlanFlow({ mode }: { mode: 'setup' | 'edit' }) {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const insets = useSafeAreaInsets();
  const { profile, save } = useProfile();
  const steps = mode === 'setup' ? SETUP : EDIT;

  const [index, setIndex] = useState(0);
  const [name, setName] = useState(profile?.display_name ?? '');
  const [goals, setGoals] = useState<Goal[]>(profile?.goals ?? []);
  const [minutes, setMinutes] = useState(profile?.focus_goal_minutes ?? 60);
  const [time, setTime] = useState(profile?.reminder_time ?? '07:00');
  const [days, setDays] = useState<number[]>(profile?.reminder_days ?? [1, 2, 3, 4, 5]);
  const [remind, setRemind] = useState(profile?.reminders_enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = steps[index];
  const counted = COUNTED.indexOf(step);
  const tiles = Tints[scheme];

  const canContinue =
    (step !== 'name' || name.trim().length > 0) && (step !== 'goals' || goals.length > 0) && (step !== 'nudge' || !remind || days.length > 0);

  function next() {
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  }
  function back() {
    if (index === 0) goBack();
    else setIndex((i) => i - 1);
  }

  function toggleGoal(goal: Goal) {
    setGoals((current) =>
      current.includes(goal) ? current.filter((g) => g !== goal) : current.length >= 3 ? current : [...current, goal],
    );
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      if (goals.includes('quit')) {
        const habits = await listHabits();
        if (!habits.some((h) => h.kind === 'quit')) {
          await createHabit({ name: 'Break the habit', kind: 'quit', icon: 'flame', color: 'bubblegum' });
        }
      }
      await scheduleReminders(time, days, remind).catch(() => 'off');
      // Saving the profile last: in setup mode this flips the route guard and leaves this screen.
      await save({
        display_name: name.trim(),
        goals,
        focus_goal_minutes: minutes,
        reminder_time: time,
        reminder_days: days,
        reminders_enabled: remind,
        onboarded_at: profile?.onboarded_at ?? new Date().toISOString(),
      });
      if (mode === 'edit') goBack();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  const clock = formatTime12(time);

  return (
    <ThemedView style={[styles.fill, { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + Spacing.three }]}>
      <View style={styles.column}>
        {step !== 'welcome' && (
          <View style={styles.topBar}>
            <IconButton
              icon={index === 0 ? 'close' : 'chevronLeft'}
              label={index === 0 ? 'Close' : 'Back'}
              onPress={back}
              disabled={mode === 'setup' && index === 0}
            />
            {counted >= 0 ? (
              <View style={styles.progressRow}>
                {COUNTED.map((s, i) => (
                  <View key={s} style={[styles.progressSeg, { backgroundColor: i <= counted ? theme.text : theme.fog }]} />
                ))}
              </View>
            ) : (
              <View style={styles.progressRow} />
            )}
            <ThemedText type="caption" themeColor="textSecondary" style={styles.counter}>
              {counted >= 0 ? `${counted + 1}/${COUNTED.length}` : ''}
            </ThemedText>
          </View>
        )}

        <ScrollView style={styles.fill} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <MotiView key={step} from={{ opacity: 0, translateX: 24 }} animate={{ opacity: 1, translateX: 0 }} transition={Motion.settle} style={styles.stepBody}>
            {step === 'welcome' && (
              <>
                <View style={styles.heroCard}>
                  <Mesh />
                  <View style={[styles.heroBlob, { top: '18%', left: '12%' }]}>
                    <Blob shape="cloud" color={BlobColors.peach} size={64} mood="calm" />
                  </View>
                  <View style={[styles.heroBlob, { top: '36%', left: '38%' }]}>
                    <Blob shape="flower" color={BlobColors.bubblegum} size={112} />
                  </View>
                  <View style={[styles.heroBlob, { top: '60%', right: '12%' }]}>
                    <Blob shape="round" color={BlobColors.lilac} size={56} mood="wow" />
                  </View>
                </View>
                <ThemedText type="hero">A calmer way to track your days</ThemedText>
                <ThemedText type="body" themeColor="textSecondary">
                  Meals, habits, study time and where you went. Private, and all in one place.
                </ThemedText>
              </>
            )}

            {step === 'name' && (
              <>
                <ThemedText type="display">What should we call you?</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  It&apos;s how Today will greet you.
                </ThemedText>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your first name"
                  placeholderTextColor={theme.textSecondary}
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => canContinue && next()}
                  style={[styles.bigInput, { color: theme.text, borderColor: theme.text }]}
                />
              </>
            )}

            {step === 'goals' && (
              <>
                <ThemedText type="display">What brings you here?</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Pick up to three. You can change this later.
                </ThemedText>
                <View style={styles.grid}>
                  {GOALS.map((g) => {
                    const selected = goals.includes(g.key);
                    return (
                      <Tap
                        key={g.key}
                        onPress={() => toggleGoal(g.key)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        accessibilityLabel={g.title}
                        containerStyle={styles.gridSlot}
                        style={[
                          styles.goalCard,
                          { backgroundColor: tiles[g.tile], borderColor: selected ? theme.text : 'transparent' },
                        ]}>
                        <View style={styles.goalTop}>
                          <Blob shape={g.shape} color={BlobColors[g.tile]} size={40} />
                          {selected && (
                            <MotiView from={{ scale: 0.3 }} animate={{ scale: 1 }} transition={Motion.pop} style={[styles.goalCheck, { backgroundColor: theme.text }]}>
                              <Icon name="check" color={theme.inverse} size={14} strokeWidth={3} />
                            </MotiView>
                          )}
                        </View>
                        <ThemedText type="bodyStrong" color={theme.text}>
                          {g.title}
                        </ThemedText>
                        <ThemedText type="caption" color={theme.textSecondary}>
                          {g.line}
                        </ThemedText>
                      </Tap>
                    );
                  })}
                </View>
              </>
            )}

            {step === 'time' && (
              <>
                <ThemedText type="display">How much time can you study each day?</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Pick what you can repeat, not what sounds impressive.
                </ThemedText>
                <View style={styles.bigCard}>
                  <Mesh />
                  <View style={styles.bigCardBlob}>
                    <Blob shape="bean" color={BlobColors.periwinkle} size={48} mood="calm" />
                  </View>
                  <MotiView key={minutes} from={{ scale: 0.85, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={Motion.pop}>
                    <ThemedText type="number" color={theme.text} style={styles.center}>
                      {minutes}
                    </ThemedText>
                  </MotiView>
                  <ThemedText type="smallStrong" color={theme.textSecondary}>
                    minutes a day
                  </ThemedText>
                </View>
                <View style={styles.options}>
                  {FOCUS_OPTIONS.map((o) => {
                    const selected = o.minutes === minutes;
                    return (
                      <Tap
                        key={o.minutes}
                        onPress={() => setMinutes(o.minutes)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        style={[styles.optionRow, { backgroundColor: theme.fog, borderColor: selected ? theme.text : 'transparent' }]}>
                        <View style={styles.fill}>
                          <ThemedText type="bodyStrong">{o.minutes} minutes</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {o.line}
                          </ThemedText>
                        </View>
                        <View style={[styles.radio, { borderColor: selected ? theme.text : theme.textSecondary }]}>
                          {selected && <View style={[styles.radioDot, { backgroundColor: theme.text }]} />}
                        </View>
                      </Tap>
                    );
                  })}
                </View>
              </>
            )}

            {step === 'nudge' && (
              <>
                <ThemedText type="display">When should we nudge you?</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  One reminder on the days you pick. Never more than one a day.
                </ThemedText>
                <View style={[styles.bigCard, !remind && styles.dimmed]}>
                  <Mesh />
                  <View style={styles.clockRow}>
                    <ThemedText type="number" color={theme.text}>
                      {clock.time}
                    </ThemedText>
                    <ThemedText type="title" color={theme.text} style={styles.period}>
                      {clock.period}
                    </ThemedText>
                  </View>
                  <View style={styles.cardTags}>
                    <View style={[styles.tag, { backgroundColor: theme.text }]}>
                      <ThemedText type="caption" color={theme.inverse}>
                        {Number(time.slice(0, 2)) < 12 ? 'Morning' : 'Evening'}
                      </ThemedText>
                    </View>
                    <View style={[styles.tag, { backgroundColor: theme.glass }]}>
                      <ThemedText type="caption" color={theme.text}>
                        {describeDays(days)}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                <View style={styles.chips}>
                  {TIME_OPTIONS.map((t) => (
                    <Chip
                      key={t}
                      label={`${formatTime12(t).time} ${formatTime12(t).period.toLowerCase()}`}
                      selected={t === time}
                      onPress={() => setTime(t)}
                    />
                  ))}
                </View>

                <View style={[styles.panel, { backgroundColor: theme.fog }]}>
                  <View style={styles.panelTop}>
                    <ThemedText type="smallStrong">Remind me on</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {days.length} {days.length === 1 ? 'day' : 'days'}
                    </ThemedText>
                  </View>
                  <View style={styles.weekRow}>
                    {WEEK_ORDER.map(({ day, letter }) => {
                      const on = days.includes(day);
                      return (
                        <Tap
                          key={day}
                          scaleTo={0.85}
                          onPress={() => setDays((d) => (on ? d.filter((x) => x !== day) : [...d, day]))}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on }}
                          accessibilityLabel={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]}
                          style={styles.dayCol}>
                          <ThemedText type="caption" themeColor="textSecondary">
                            {letter}
                          </ThemedText>
                          <View style={[styles.dayDot, { backgroundColor: on ? theme.text : theme.background }]}>
                            {on && <Icon name="check" color={theme.inverse} size={14} strokeWidth={3} />}
                          </View>
                        </Tap>
                      );
                    })}
                  </View>
                  <View style={styles.panelTop}>
                    <View style={styles.fill}>
                      <ThemedText type="smallStrong">Send me a reminder</ThemedText>
                      {!remindersSupported && (
                        <ThemedText type="caption" themeColor="textSecondary">
                          Reminders arrive in the Android app.
                        </ThemedText>
                      )}
                    </View>
                    <Switch
                      value={remind}
                      onValueChange={setRemind}
                      trackColor={{ false: theme.border, true: theme.text }}
                      thumbColor={Platform.OS === 'android' ? theme.surface : undefined}
                    />
                  </View>
                </View>
              </>
            )}

            {step === 'ready' && (
              <>
                <View style={[styles.heroCard, styles.readyCard]}>
                  <Mesh />
                  <View style={styles.readyBlobs}>
                    <Blob shape="cloud" color={BlobColors.peach} size={46} mood="calm" />
                    <Blob shape="flower" color={BlobColors.bubblegum} size={72} />
                    <Blob shape="round" color={BlobColors.lilac} size={42} mood="wow" />
                  </View>
                  <ThemedText type="display" color={theme.text} style={styles.center}>
                    Your plan is ready
                  </ThemedText>
                  <ThemedText type="small" color={theme.textSecondary} style={styles.center}>
                    Built from your answers. Change it any time from your profile.
                  </ThemedText>
                </View>
                <View style={[styles.summary, { backgroundColor: theme.fog }]}>
                  <SummaryRow
                    icon="target"
                    tile={tiles.bubblegum}
                    title={GOALS.filter((g) => goals.includes(g.key)).map((g) => g.title).join(', ') || 'Just keeping track'}
                    line="What you’re here for"
                  />
                  <SummaryRow icon="focus" tile={tiles.periwinkle} title={`${minutes} minutes of study a day`} line="Your focus goal" />
                  <SummaryRow
                    icon="bell"
                    tile={tiles.butter}
                    title={remind ? `Reminder at ${clock.time} ${clock.period}` : 'No reminders'}
                    line={remind ? `On ${describeDays(days)}` : 'You can turn them on later'}
                  />
                </View>
                {error && (
                  <ThemedText type="small" color={theme.danger}>
                    {error}
                  </ThemedText>
                )}
              </>
            )}
          </MotiView>
        </ScrollView>

        <View style={styles.footer}>
          {step === 'welcome' && <Button label="Set up my plan" onPress={next} />}
          {step !== 'welcome' && step !== 'ready' && <Button label="Continue" onPress={next} disabled={!canContinue} />}
          {step === 'ready' && (
            <>
              <Button label={mode === 'setup' ? 'Start day 1' : 'Save plan'} onPress={finish} loading={saving} />
              <Button label="Adjust my plan" variant="quiet" onPress={() => setIndex(steps.indexOf('goals'))} />
            </>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

function SummaryRow({ icon, tile, title, line }: { icon: IconName; tile: string; title: string; line: string }) {
  const theme = useTheme();
  return (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryIcon, { backgroundColor: tile }]}>
        <Icon name={icon} color={theme.text} size={18} />
      </View>
      <View style={styles.fill}>
        <ThemedText type="bodyStrong">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {line}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: ContentWidth.phone, alignSelf: 'center', paddingHorizontal: Spacing.four - 4 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingBottom: Spacing.three },
  progressRow: { flex: 1, flexDirection: 'row', gap: 6 },
  progressSeg: { flex: 1, height: 5, borderRadius: 3 },
  counter: { minWidth: 28, textAlign: 'right' },
  body: { paddingBottom: Spacing.four },
  stepBody: { gap: Spacing.three },
  heroCard: { height: 320, borderRadius: Radius.sheet, overflow: 'hidden', marginBottom: Spacing.two },
  heroBlob: { position: 'absolute' },
  readyCard: { height: 'auto', padding: Spacing.four, alignItems: 'center', gap: Spacing.two },
  readyBlobs: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: Spacing.two },
  bigInput: {
    fontFamily: Fonts.display,
    fontSize: 30,
    borderBottomWidth: 2.5,
    paddingVertical: Spacing.two,
    marginTop: Spacing.three,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: Spacing.two },
  gridSlot: { width: '48%', flexGrow: 1 },
  goalCard: { borderRadius: Radius.large, padding: Spacing.three, gap: 4, borderWidth: 2.5, minHeight: 138 },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.two },
  goalCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigCard: {
    borderRadius: Radius.sheet,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  dimmed: { opacity: 0.45 },
  bigCardBlob: { position: 'absolute', top: Spacing.three, right: Spacing.three },
  center: { textAlign: 'center' },
  options: { gap: 10 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 2,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  clockRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  period: { marginBottom: 10 },
  cardTags: { flexDirection: 'row', gap: Spacing.two },
  tag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.pill },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  panel: { borderRadius: Radius.large, padding: Spacing.three, gap: Spacing.three },
  panelTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6 },
  dayDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  summary: { borderRadius: Radius.large, padding: Spacing.three, gap: Spacing.three },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  summaryIcon: { width: 40, height: 40, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  footer: { gap: Spacing.two, paddingTop: Spacing.two },
});
