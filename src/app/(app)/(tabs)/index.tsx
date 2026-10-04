import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Buddy } from '@/components/buddy';
import { type DialEvent, DayDial, DialLegend } from '@/components/day-dial';
import { HabitRow, QuitRow } from '@/components/habits/habit-row';
import { InstallBanner } from '@/components/install-banner';
import { RouteMap } from '@/components/map/route-map';
import { routeDistanceKm } from '@/components/map/tiles';
import { MoodPicker } from '@/components/mood-picker';
import { ThemedText } from '@/components/themed-text';
import { TodoRow } from '@/components/todo-row';
import { Confetti } from '@/components/ui/confetti';
import { Group, Row } from '@/components/ui/group';
import { Icon, IconBadge } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Mesh } from '@/components/ui/mesh';
import { Reveal } from '@/components/ui/reveal';
import { Screen, Section } from '@/components/ui/screen';
import { Tap } from '@/components/ui/tap';
import { useToast } from '@/components/ui/toast';
import { WeekStrip } from '@/components/ui/week-strip';
import { FocusWidget, FoodWidget, SleepWidget, StepsWidget, WaterWidget, WidgetGrid } from '@/components/widgets';
import { Fonts, Hues, Radius, skyAt, Spacing, Tints, Tracker } from '@/constants/theme';
import { useAsyncData } from '@/hooks/use-async-data';
import { useBody } from '@/hooks/use-body';
import { useHabits } from '@/hooks/use-habits';
import { useLayout } from '@/hooks/use-layout';
import { useRouteDay } from '@/hooks/use-route-day';
import { useTheme } from '@/hooks/use-theme';
import { addWater, deleteWater, glasses, workoutName } from '@/lib/api/body';
import { listFoodEntries, mealForHour } from '@/lib/api/food';
import { toggleDay } from '@/lib/api/habits';
import { getMood, type MoodLevel, MOODS, setMood } from '@/lib/api/moods';
import { listStudySessions } from '@/lib/api/study';
import { addTodo, listTodos, setTodoDone, type Todo } from '@/lib/api/todos';
import { isAutoRule } from '@/lib/auto';
import { asAvatar } from '@/lib/avatar';
import { dismissAuto, runAutoHabits } from '@/lib/automation';
import { dayTotal, hourly, sleepMinutes, sleepOnDay } from '@/lib/body';
import { daySeed } from '@/lib/buddy';
import { greeting, isSameDay, localDateString } from '@/lib/day';
import { errorMessage } from '@/lib/errors';
import { formatMinutes } from '@/lib/format';
import { countsByDay, currentStreak, daysClean, logDays } from '@/lib/habit-stats';
import { captureIfStale } from '@/lib/location/tracking';
import { useProfile } from '@/lib/profile';
import { useThemeMode } from '@/lib/theme-mode';
import { groupTodos } from '@/lib/todos';

const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const minutesBetween = (a: string, b: string) => (+new Date(b) - +new Date(a)) / 60000;

export default function TodayScreen() {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const { profile } = useProfile();
  const { twoUp, size } = useLayout();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [day, setDay] = useState(() => new Date());
  const [pending, setPending] = useState<string | null>(null);
  const [skyWidth, setSkyWidth] = useState(0);
  const [scrubHour, setScrubHour] = useState<number | null>(null);
  // While a finger scrubs the dial, the page mustn't scroll under it.
  const [dialHeld, setDialHeld] = useState(false);
  const [burst, setBurst] = useState(0);
  const now = new Date();
  const isToday = isSameDay(day, now);
  const hues = Hues[scheme];
  const tints = Tints[scheme];
  // Phones get the sky edge to edge under the status bar; wider layouts keep it as a card.
  const immersive = !twoUp;

  const habitsQuery = useHabits();
  const route = useRouteDay(day);
  const body = useBody(day);
  const food = useAsyncData(useCallback(() => listFoodEntries(day), [day]));
  const study = useAsyncData(useCallback(() => listStudySessions(day), [day]));
  const mood = useAsyncData(useCallback(() => getMood(day), [day]));
  const [moodDraft, setMoodDraft] = useState<{ day: string; level: MoodLevel } | null>(null);
  const refetchRoute = route.refetch;
  const refetchHabits = habitsQuery.refetch;

  // Web/iOS PWA has no background tracking: each visit adds a point instead.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    captureIfStale()
      .then((captured) => {
        if (captured) refetchRoute();
      })
      .catch(() => {});
  }, [refetchRoute]);

  // Habits with a rule tick themselves: on every visit, and again once fresh health data lands.
  const autoTick = useCallback(() => {
    runAutoHabits()
      .then((names) => {
        if (!names.length) return;
        refetchHabits();
        toast(`Ticked for you: ${names.join(', ')}`);
      })
      .catch(() => {});
  }, [refetchHabits, toast]);
  useFocusEffect(autoTick);
  useEffect(() => {
    if (body.data) autoTick();
  }, [body.data, autoTick]);

  const data = habitsQuery.data;
  const logs = data?.logs ?? [];
  const buildHabits = data?.habits.filter((h) => h.kind === 'build') ?? [];
  const quitHabits = data?.habits.filter((h) => h.kind === 'quit') ?? [];
  const dayKey = localDateString(day);
  const doneDays = logDays(logs.filter((l) => buildHabits.some((h) => h.id === l.habit_id)));
  const dayLogs = logs.filter((l) => localDateString(new Date(l.logged_at)) === dayKey);
  const habitsDone = buildHabits.filter((h) => dayLogs.some((l) => l.habit_id === h.id)).length;
  const slipsToday = dayLogs.filter((l) => quitHabits.some((h) => h.id === l.habit_id)).length;

  const sessions = study.data ?? [];
  const studyMinutes = sessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60;
  const goal = profile?.focus_goal_minutes ?? 60;
  const meals = food.data ?? [];
  const points = route.data?.points ?? [];
  const km = routeDistanceKm(points);
  const firstName = profile?.display_name?.split(' ')[0];
  const moodLevel = moodDraft?.day === dayKey ? moodDraft.level : (mood.data?.mood ?? null);

  const on = (iso: string) => localDateString(new Date(iso)) === dayKey;
  const stepRows = body.data?.steps ?? [];
  const sleep = body.data?.sleep ?? [];
  const water = (body.data?.water ?? []).filter((w) => on(w.logged_at));
  const workouts = (body.data?.workouts ?? []).filter((w) => on(w.started_at));
  const steps = dayTotal(stepRows, dayKey);
  const stepsByHour = hourly(stepRows, dayKey);
  const slept = sleepMinutes(sleep, dayKey);
  const lastNight = sleep.filter((s) => on(s.ended_at)).at(-1);
  const drunk = glasses(water);
  const stepGoal = profile?.step_goal ?? 8000;
  const waterGoal = profile?.water_goal ?? 8;
  const sleepGoal = profile?.sleep_goal_minutes ?? 480;
  const nameOf = (id: string) => data?.habits.find((h) => h.id === id)?.name;

  const events: DialEvent[] = [
    ...sleepOnDay(sleep, day).map((p) => ({ kind: 'sleep' as const, ...p })),
    ...sessions.map((s) => ({ kind: 'focus' as const, start: new Date(s.started_at), end: new Date(s.ended_at), label: s.topic ?? undefined })),
    ...workouts.map((w) => ({ kind: 'workout' as const, start: new Date(w.started_at), end: new Date(w.ended_at), label: workoutName(w) })),
    ...meals.map((m) => ({ kind: 'meal' as const, at: new Date(m.logged_at), label: m.note })),
    ...water.map((w) => ({ kind: 'water' as const, at: new Date(w.logged_at), label: `${w.ml} ml` })),
    ...dayLogs.map((l) => ({
      kind: quitHabits.some((h) => h.id === l.habit_id) ? ('slip' as const) : ('habit' as const),
      at: new Date(l.logged_at),
      label: nameOf(l.habit_id),
    })),
    ...(mood.data ? [{ kind: 'mood' as const, at: new Date(mood.data.updated_at), label: MOODS[mood.data.mood - 1]?.label }] : []),
    ...(points.length > 1
      ? [{ kind: 'route' as const, start: new Date(points[0].recorded_at), end: new Date(points[points.length - 1].recorded_at) }]
      : []),
  ];

  async function toggle(habitId: string) {
    const wasDone = dayLogs.some((l) => l.habit_id === habitId);
    const finishing = !wasDone && habitsDone === buildHabits.length - 1;
    setPending(habitId);
    try {
      await toggleDay(habitId, day);
      // Unticking an automatic habit by hand keeps it unticked for the day.
      if (wasDone && isAutoRule(data?.habits.find((h) => h.id === habitId)?.auto)) await dismissAuto(habitId, day);
      await habitsQuery.refetch();
      if (finishing) setBurst((b) => b + 1);
    } catch (err) {
      toast(errorMessage(err, 'Couldn’t update that habit.'));
    } finally {
      setPending(null);
    }
  }

  async function checkIn(level: MoodLevel, note: string | null = mood.data?.note ?? null) {
    setMoodDraft({ day: dayKey, level });
    try {
      await setMood(day, level, note);
      await mood.refetch();
    } catch (err) {
      setMoodDraft(null);
      toast(errorMessage(err, 'Couldn’t save your mood.'));
    }
  }

  async function drink() {
    try {
      const id = await addWater(day);
      await body.refetch();
      if (drunk + 1 === waterGoal) setBurst((b) => b + 1);
      toast(`${drunk + 1} of ${waterGoal} glasses`, { label: 'Undo', onPress: () => deleteWater(id).then(body.refetch) });
    } catch (err) {
      toast(errorMessage(err, 'Couldn’t add that.'));
    }
  }

  const dialSize = Math.min(size === 'phone' ? 320 : 340, skyWidth ? skyWidth - Spacing.four : 300);
  const skyHour = scrubHour ?? (isToday ? now.getHours() + now.getMinutes() / 60 : 12);
  const open = (id: string) => router.push({ pathname: '/habit/[id]', params: { id } });
  const openBody = () => router.push({ pathname: '/body', params: { day: dayKey } });
  const workoutMinutes = workouts.reduce((sum, w) => sum + minutesBetween(w.started_at, w.ended_at), 0);
  const title = isToday ? `${greeting(now).replace(',', '')}${firstName ? `, ${firstName}` : ''}` : 'Looking back';
  const dateLine = day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const dial = (
    <>
      <DayDial events={events} steps={stepsByHour} size={dialSize} now={isToday ? now : undefined} onScrub={setScrubHour} onHoldChange={setDialHeld}>
        <View style={styles.dialCenter}>
          <ThemedText type="hero" style={styles.tabular} accessibilityLabel={`${habitsDone} of ${buildHabits.length} habits done`}>
            {habitsDone}
            <ThemedText type="title" themeColor="textTertiary">
              /{buildHabits.length}
            </ThemedText>
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            habits done
          </ThemedText>
        </View>
      </DayDial>
      <DialLegend events={events} steps={stepsByHour} />
      <ThemedText type="caption" themeColor="textTertiary">
        Press and hold the ring to replay the day
      </ThemedText>
    </>
  );

  const sky = immersive ? (
    <View
      style={[styles.immersive, { marginTop: -(insets.top + Spacing.three), paddingTop: insets.top + Spacing.three }]}
      onLayout={(e) => setSkyWidth(e.nativeEvent.layout.width - 40)}>
      <Mesh colors={skyAt(scheme, skyHour)} />
      <View style={styles.skyHeader}>
        <View style={styles.fill}>
          <ThemedText type="smallStrong" themeColor="textSecondary">
            {dateLine}
          </ThemedText>
          <ThemedText type="display" accessibilityRole="header" numberOfLines={2}>
            {title}
          </ThemedText>
        </View>
        <Tap onPress={() => router.push('/profile')} scaleTo={0.92} accessibilityRole="button" accessibilityLabel="Profile and settings">
          <Avatar avatar={asAvatar(profile?.avatar)} size={44} />
        </Tap>
      </View>
      <WeekStrip day={day} onChange={setDay} marked={doneDays} />
      <View style={styles.dialWrap}>{dial}</View>
      <Confetti burst={burst} />
    </View>
  ) : (
    <View style={[styles.sky, { borderColor: theme.border }]} onLayout={(e) => setSkyWidth(e.nativeEvent.layout.width)}>
      <Mesh colors={skyAt(scheme, skyHour)} />
      {dial}
      <Confetti burst={burst} />
    </View>
  );

  const buddyAndMood = (
    <>
      {isToday && (
        <Buddy
          seed={daySeed(day)}
          ctx={{
            hour: now.getHours(),
            habitsDone,
            habitsTotal: buildHabits.length,
            slipsToday,
            focusMinutes: studyMinutes,
            focusGoal: goal,
            meals: meals.length,
            mood: moodLevel,
            steps,
            stepGoal,
            sleepMinutes: slept,
            water: drunk,
            waterGoal,
          }}
        />
      )}
      <Section title={isToday ? 'How’s today?' : 'How was the day?'}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <MoodPicker value={moodLevel} onChange={(level) => checkIn(level)} />
          {moodLevel !== null && (
            <Journal key={`${dayKey}-${mood.data?.note ?? ''}`} initial={mood.data?.note ?? ''} onSave={(note) => checkIn(moodLevel, note || null)} />
          )}
        </View>
      </Section>
    </>
  );

  const habits = (
    <Section title="Habits" action={<IconButton icon="add" label="New habit" size={16} onPress={() => router.push('/habit/new')} />}>
      {data && data.habits.length === 0 ? (
        <Group>
          <Row
            title="Add your first habit"
            subtitle="It can even tick itself: steps, a place, a workout"
            leading={<IconBadge name="sparkles" size={36} hue={hues[Tracker.habit]} tint={tints[Tracker.habit]} />}
            chevron
            onPress={() => router.push('/habit/new')}
          />
        </Group>
      ) : (
        <Group>
          {buildHabits.map((habit) => {
            const days = logDays(logs, habit.id);
            return (
              <HabitRow
                key={habit.id}
                habit={habit}
                done={days.has(dayKey)}
                streak={currentStreak(days)}
                disabled={pending === habit.id}
                onToggle={() => toggle(habit.id)}
                onOpen={() => open(habit.id)}
              />
            );
          })}
          {quitHabits.map((habit) => (
            <QuitRow
              key={habit.id}
              habit={habit}
              daysClean={daysClean(data?.lastSlip[habit.id] ?? null, habit.created_at)}
              slipsToday={countsByDay(logs, 1, habit.id).at(-1)?.count ?? 0}
              onChange={habitsQuery.refetch}
              onOpen={() => open(habit.id)}
            />
          ))}
        </Group>
      )}
      {habitsQuery.error && (
        <ThemedText type="small" color={theme.danger}>
          {habitsQuery.error}
        </ThemedText>
      )}
    </Section>
  );

  const widgets = (
    <WidgetGrid>
      <StepsWidget
        steps={steps}
        goal={stepGoal}
        hourly={stepsByHour}
        extra={workouts.length ? `Plus ${formatMinutes(workoutMinutes)} of ${workoutName(workouts[0]).toLowerCase()}${workouts.length > 1 ? ' and more' : ''}` : undefined}
        onPress={openBody}
      />
      <WaterWidget glasses={drunk} goal={waterGoal} onPress={openBody} onAdd={drink} />
      <SleepWidget minutes={slept} goal={sleepGoal} window={lastNight ? `${time(lastNight.started_at)} to ${time(lastNight.ended_at)}` : undefined} onPress={openBody} />
      <FocusWidget minutes={studyMinutes} goal={goal} onPress={() => router.navigate('/focus')} />
      <FoodWidget
        count={meals.length}
        last={meals.at(-1)?.note}
        meals={new Set(meals.map((m) => m.meal ?? mealForHour(new Date(m.logged_at).getHours())))}
        onPress={() => router.navigate('/food')}
      />
    </WidgetGrid>
  );

  const more = (
    <>
      <Group>
        <Row
          title="Your week and year"
          subtitle="Trends, highlights and a year in pixels"
          leading={<IconBadge name="insights" size={36} hue={theme.accent} tint={theme.fog} />}
          chevron
          onPress={() => router.push('/insights')}
        />
      </Group>
      <Tap
        onPress={() => router.push({ pathname: '/route', params: { day: dayKey } })}
        scaleTo={0.99}
        accessibilityRole="button"
        accessibilityLabel={points.length > 1 ? `Route: ${km.toFixed(1)} kilometres` : 'Route map'}
        style={[styles.routeCard, { backgroundColor: theme.surface }]}>
        <View style={styles.routeTop}>
          <IconBadge name="route" size={36} hue={hues[Tracker.route]} tint={tints[Tracker.route]} />
          <View style={styles.fill}>
            <ThemedText type="body" style={styles.tabular}>
              {points.length > 1 ? `${km.toFixed(1)} km` : 'Route'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {points.length === 0 ? 'No points yet for this day' : `${points.length} ${points.length === 1 ? 'point' : 'points'} recorded`}
            </ThemedText>
          </View>
          <Icon name="chevronRight" size={16} color={theme.textTertiary} weight="bold" />
        </View>
        <View style={styles.map}>
          <RouteMap points={points} center={route.data?.center} height={150} interactive={false} lineColor={hues[Tracker.route]} />
        </View>
      </Tap>
    </>
  );

  if (immersive) {
    return (
      <Screen tabbed scrollEnabled={!dialHeld}>
        {sky}
        <InstallBanner />
        <Reveal index={1} style={styles.stack}>
          {buddyAndMood}
        </Reveal>
        <Reveal index={2}>{widgets}</Reveal>
        <Reveal index={3}>{habits}</Reveal>
        <Reveal index={4}>
          <TodayTodos />
        </Reveal>
        <Reveal index={5} style={styles.stack}>
          {more}
        </Reveal>
      </Screen>
    );
  }

  return (
    <Screen
      tabbed
      scrollEnabled={!dialHeld}
      eyebrow={
        <ThemedText type="smallStrong" themeColor="textSecondary">
          {dateLine}
        </ThemedText>
      }
      title={title}
      right={<Tap onPress={() => router.push('/profile')} scaleTo={0.92} accessibilityRole="button" accessibilityLabel="Profile and settings">
          <Avatar avatar={asAvatar(profile?.avatar)} size={44} />
        </Tap>}>
      <WeekStrip day={day} onChange={setDay} marked={doneDays} />
      <View style={styles.twoUp}>
        <Reveal index={0} style={[styles.stack, styles.half]}>
          {sky}
          {buddyAndMood}
        </Reveal>
        <Reveal index={1} style={[styles.stack, styles.half]}>
          <InstallBanner />
          {widgets}
          {habits}
          <TodayTodos />
          {more}
        </Reveal>
      </View>
    </Screen>
  );
}

/** What's due today (and anything late or undated), with a one-line add. The full list is a tap away. */
function TodayTodos() {
  const theme = useTheme();
  const toast = useToast();
  const { data, refetch } = useAsyncData(listTodos);
  const [title, setTitle] = useState('');
  const g = groupTodos(data ?? []);
  const shown = [...g.overdue, ...g.today, ...g.someday.slice(0, 3)];
  const doneToday = g.done.filter((t) => t.done_at && localDateString(new Date(t.done_at)) === localDateString(new Date()));
  const hidden = g.someday.length - Math.min(3, g.someday.length) + g.upcoming.length;

  async function add() {
    if (!title.trim()) return;
    try {
      await addTodo(title, new Date());
      setTitle('');
      refetch();
    } catch (err) {
      toast(errorMessage(err, 'Couldn’t add that task.'));
    }
  }
  const toggle = (t: Todo) => setTodoDone(t.id, !t.done_at).then(refetch).catch((err) => toast(errorMessage(err, 'Couldn’t update that.')));

  return (
    <Section
      title="To do"
      action={
        <Tap onPress={() => router.push('/todos')} scaleTo={0.94} accessibilityRole="link">
          <ThemedText type="smallStrong" color={theme.accent}>
            {hidden ? `All (${hidden} more)` : 'All'}
          </ThemedText>
        </Tap>
      }>
      <Group>
        {[...shown, ...doneToday].map((t) => (
          <TodoRow key={t.id} todo={t} onToggle={() => toggle(t)} />
        ))}
        <View style={styles.todoAdd}>
          <Icon name="add" size={18} color={theme.accent} weight="bold" />
          <TextInput
            value={title}
            onChangeText={setTitle}
            onSubmitEditing={add}
            placeholder="Add a task for today"
            placeholderTextColor={theme.textTertiary}
            accessibilityLabel="Add a task for today"
            returnKeyType="done"
            maxLength={200}
            style={[styles.todoInput, { color: theme.text }]}
          />
        </View>
      </Group>
    </Section>
  );
}

/** One line about the day, saved with the mood when you press return or leave the field. */
function Journal({ initial, onSave }: { initial: string; onSave: (note: string) => void }) {
  const theme = useTheme();
  const [text, setText] = useState(initial);
  const save = () => {
    if (text.trim() !== initial.trim()) onSave(text.trim());
  };
  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onSubmitEditing={save}
      onBlur={save}
      placeholder="One line about today (optional)"
      placeholderTextColor={theme.textTertiary}
      accessibilityLabel="One line about today"
      returnKeyType="done"
      maxLength={280}
      style={[styles.journal, { color: theme.text, backgroundColor: theme.fog }]}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  twoUp: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.four },
  stack: { gap: Spacing.four },
  half: { flex: 1, minWidth: 0 },
  immersive: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingBottom: Spacing.four,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    gap: Spacing.three,
  },
  skyHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  dialWrap: { alignItems: 'center', gap: 12 },
  sky: {
    borderRadius: Radius.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: 12,
  },
  dialCenter: { alignItems: 'center' },
  card: { borderRadius: Radius.large, padding: Spacing.two, gap: Spacing.two },
  todoAdd: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: Spacing.three + 3, paddingRight: Spacing.three },
  todoInput: { flex: 1, minHeight: 52, fontSize: 17, fontFamily: Fonts.regular },
  journal: { minHeight: 46, borderRadius: Radius.medium, paddingHorizontal: Spacing.three, fontSize: 16, fontFamily: Fonts.regular, margin: 4 },
  routeCard: { borderRadius: Radius.large, overflow: 'hidden' },
  routeTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.three, paddingVertical: 12 },
  map: { marginHorizontal: Spacing.two, marginBottom: Spacing.two, borderRadius: Radius.medium, overflow: 'hidden' },
});
