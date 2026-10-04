import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Blob, BlobColors } from '@/components/ui/blob';
import { Group, Row } from '@/components/ui/group';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Screen, Section } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { type PixelMetric, YearPixels } from '@/components/year-pixels';
import { Hues, Radius, Spacing, Tracker } from '@/constants/theme';
import { useAsyncData } from '@/hooks/use-async-data';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { listFoodEntriesBetween } from '@/lib/api/food';
import { listDailySteps, listSleep, listWater } from '@/lib/api/body';
import { listHabits, listLogsSince, listRecentLogs } from '@/lib/api/habits';
import { listLocationPointsBetween } from '@/lib/api/location';
import { listMoods, MOODS } from '@/lib/api/moods';
import { listStudySessionsBetween } from '@/lib/api/study';
import { addDays, dayRange, localDateString, startOfDay } from '@/lib/day';
import { formatMinutes } from '@/lib/format';
import { type DayStat, dailyStats, highlights } from '@/lib/insights';
import { useProfile } from '@/lib/profile';
import { useThemeMode } from '@/lib/theme-mode';

/** How far back the week can be paged: habit logs are fetched for this window. */
const MAX_WEEKS_BACK = 7;

async function loadWeek(end: Date) {
  const from = startOfDay(addDays(end, -13));
  const to = dayRange(end).end;
  // Newer trackers fail soft: the rest of the week still shows if one table is unreachable.
  const [habits, logs, sessions, meals, moods, points, stepsDaily, sleep, water] = await Promise.all([
    listHabits(),
    listRecentLogs(14 + MAX_WEEKS_BACK * 7),
    listStudySessionsBetween(from, to),
    listFoodEntriesBetween(from, to),
    listMoods(from, end).catch(() => []),
    listLocationPointsBetween(from, end).catch(() => []),
    listDailySteps(from, end).catch(() => []),
    listSleep(addDays(from, -1), end).catch(() => []),
    listWater(from, end).catch(() => []),
  ]);
  const weekStart = localDateString(addDays(end, -6));
  return {
    stats: dailyStats({ end, habits, logs, sessions, meals, moods, points, stepsDaily, sleep, water }),
    notes: moods.filter((m) => m.note && m.day >= weekStart),
  };
}

/** Everything for the year view, from January 1st to today. */
async function loadYear() {
  const today = new Date();
  const jan1 = new Date(today.getFullYear(), 0, 1);
  const [moods, habits, logs, steps] = await Promise.all([
    listMoods(jan1, today).catch(() => []),
    listHabits(),
    listLogsSince(jan1),
    listDailySteps(jan1, today).catch(() => []),
  ]);
  const doneOn = new Map<string, Set<string>>();
  for (const l of logs) {
    const key = localDateString(new Date(l.logged_at));
    doneOn.set(key, (doneOn.get(key) ?? new Set()).add(l.habit_id));
  }
  const build = habits.filter((h) => h.kind === 'build');
  const habitShare = new Map<string, number>();
  for (let d = jan1; d <= today; d = addDays(d, 1)) {
    const key = localDateString(d);
    const existing = build.filter((h) => localDateString(new Date(h.created_at)) <= key);
    if (existing.length) habitShare.set(key, existing.filter((h) => doneOn.get(key)?.has(h.id)).length / existing.length);
  }
  return {
    year: today.getFullYear(),
    mood: new Map(moods.map((m) => [m.day, m.mood as number])),
    habits: habitShare,
    steps: new Map(steps.map((s) => [s.day, s.total])),
  };
}

export default function InsightsScreen() {
  const theme = useTheme();
  const { twoUp } = useLayout();
  const [weeksBack, setWeeksBack] = useState(0);
  const end = startOfDay(addDays(new Date(), -7 * weeksBack));
  const fetcher = useCallback(() => loadWeek(startOfDay(addDays(new Date(), -7 * weeksBack))), [weeksBack]);
  const { data, error, isLoading } = useAsyncData(fetcher);
  const stats = data?.stats;
  const year = useAsyncData(loadYear);
  const [metric, setMetric] = useState<PixelMetric>('mood');
  const { profile } = useProfile();

  const week = stats?.slice(7) ?? [];
  const start = addDays(end, -6);
  const range = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} to ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  const lines = stats ? highlights(stats) : [];

  return (
    <Screen
      back
      title={weeksBack === 0 ? 'Your week' : weeksBack === 1 ? 'Last week' : `${weeksBack} weeks ago`}
      subtitle={range}
      right={
        <View style={styles.arrows}>
          <IconButton icon="chevronLeft" label="Previous week" disabled={weeksBack >= MAX_WEEKS_BACK} onPress={() => setWeeksBack((w) => w + 1)} />
          <IconButton icon="chevronRight" label="Next week" disabled={weeksBack === 0} onPress={() => setWeeksBack((w) => w - 1)} />
        </View>
      }>
      {error && (
        <ThemedText type="small" color={theme.danger}>
          {error}
        </ThemedText>
      )}

      {stats && (
        <View style={[styles.summary, { backgroundColor: theme.surface }]}>
          <Blob shape="cloud" color={BlobColors[Tracker.mood]} size={56} mood={lines.length ? 'happy' : 'sleepy'} />
          <View style={styles.lines}>
            {lines.length ? (
              lines.map((l) => (
                <ThemedText key={l} type="body">
                  {l}
                </ThemedText>
              ))
            ) : (
              <ThemedText type="body" themeColor="textSecondary">
                Nothing logged this week yet. Tick a habit or log a meal and this fills in.
              </ThemedText>
            )}
          </View>
        </View>
      )}

      {(stats || isLoading) && (
        <View style={[styles.grid, twoUp && styles.gridTwo]}>
          <Chart wide={twoUp} title="Habits" icon="habit" tile={Tracker.habit} week={week} value={(d) => d.habits} max={1} format={(v) => `${Math.round(v * 100)}%`} total={(vs) => `${Math.round(avg(vs) * 100)}% on average`} />
          <Chart wide={twoUp} title="Focus" icon="focus" tile={Tracker.focus} week={week} value={(d) => d.focus} format={(v) => formatMinutes(v)} total={(vs) => `${formatMinutes(sum(vs))} in total`} />
          <Chart wide={twoUp} title="Meals" icon="food" tile={Tracker.food} week={week} value={(d) => d.meals} format={(v) => String(v)} total={(vs) => `${sum(vs)} logged`} />
          <Chart wide={twoUp} title="Mood" icon="mood4" tile={Tracker.mood} week={week} value={(d) => d.mood} max={5} format={(v) => ['', 'Rough', 'Low', 'Okay', 'Good', 'Great'][v]} total={(vs) => (vs.length ? `${vs.length} check-ins` : 'No check-ins')} />
          <Chart wide={twoUp} title="Steps" icon="steps" tile={Tracker.steps} week={week} value={(d) => d.steps} format={(v) => v.toLocaleString()} total={(vs) => `${Math.round(avg(vs)).toLocaleString()} a day`} />
          <Chart wide={twoUp} title="Sleep" icon="night" tile={Tracker.sleep} week={week} value={(d) => (d.sleep ? d.sleep / 60 : null)} format={(v) => formatMinutes(v * 60)} total={(vs) => (vs.length ? `${formatMinutes(avg(vs) * 60)} a night` : 'No nights logged')} />
          <Chart wide={twoUp} title="Water" icon="water" tile={Tracker.water} week={week} value={(d) => d.water} format={(v) => `${v} glasses`} total={(vs) => `${sum(vs)} glasses`} />
          <Chart wide={twoUp} title="Distance" icon="route" tile={Tracker.route} week={week} value={(d) => d.km} format={(v) => `${v.toFixed(1)} km`} total={(vs) => `${sum(vs).toFixed(1)} km`} />
        </View>
      )}

      {!!data?.notes.length && (
        <Section title="In your words">
          <Group>
            {data.notes.map((n) => (
              <Row key={n.day} title={n.note ?? ''} subtitle={`${dayName(n.day)}, feeling ${MOODS[n.mood - 1]?.label.toLowerCase()}`} />
            ))}
          </Group>
        </Section>
      )}

      {year.data && (
        <Section title={`${year.data.year} in pixels`}>
          <Segmented
            label="Colour the year by"
            value={metric}
            onChange={setMetric}
            options={[
              { key: 'mood', label: 'Mood' },
              { key: 'habits', label: 'Habits' },
              { key: 'steps', label: 'Steps' },
            ]}
          />
          <View style={[styles.chart, { backgroundColor: theme.surface }]}>
            <YearPixels year={year.data.year} metric={metric} values={year.data[metric]} stepGoal={profile?.step_goal} />
          </View>
        </Section>
      )}
    </Screen>
  );
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);

type ChartProps = {
  title: string;
  icon: IconName;
  tile: (typeof Tracker)[keyof typeof Tracker];
  week: DayStat[];
  value: (d: DayStat) => number | null;
  max?: number;
  format: (v: number) => string;
  total: (values: number[]) => string;
  /** In the two-column grid: share the row, at least 320 wide. */
  wide?: boolean;
};

/** Seven bars, one per day, in the tracker's hue. Days with no data draw a flat stub. */
function Chart({ title, icon, tile, week, value, max, format, total, wide }: ChartProps) {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const hue = Hues[scheme][tile];
  const values = week.map(value);
  const present = values.filter((v): v is number => v !== null);
  const top = max ?? Math.max(1, ...present);

  return (
    <Section style={wide ? styles.chartSlot : undefined}>
      <View style={[styles.chart, { backgroundColor: theme.surface }]}>
        <View style={styles.chartHead}>
          <Icon name={icon} size={18} color={hue} weight="fill" />
          <ThemedText type="bodyStrong" style={styles.fill}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.tabular}>
            {week.length ? total(present) : ' '}
          </ThemedText>
        </View>
        <View
          style={styles.bars}
          accessibilityRole="image"
          accessibilityLabel={`${title}: ${week.map((d, i) => `${dayName(d.date)} ${values[i] === null ? 'no data' : format(values[i] as number)}`).join(', ')}`}>
          {(week.length ? week : Array.from({ length: 7 }, () => null)).map((d, i) => {
            const v = values[i] ?? 0;
            return (
              <View key={d?.date ?? i} style={styles.barTrack}>
                <View style={[styles.bar, { height: `${Math.max(4, (v / top) * 100)}%`, backgroundColor: v > 0 ? hue : theme.fog }]} />
              </View>
            );
          })}
        </View>
        <View style={styles.labels}>
          {week.map((d) => (
            <ThemedText key={d.date} type="caption" themeColor="textTertiary" style={styles.label}>
              {dayName(d.date).slice(0, 1)}
            </ThemedText>
          ))}
        </View>
      </View>
    </Section>
  );
}

function dayName(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short' });
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  arrows: { flexDirection: 'row', gap: Spacing.two },
  summary: { flexDirection: 'row', gap: Spacing.three, borderRadius: Radius.sheet, padding: Spacing.four - 4, alignItems: 'flex-start' },
  lines: { flex: 1, gap: 10 },
  grid: { gap: Spacing.three },
  gridTwo: { flexDirection: 'row', flexWrap: 'wrap' },
  chartSlot: { flexGrow: 1, flexBasis: 320 },
  chart: { borderRadius: Radius.large, padding: Spacing.three, gap: 12 },
  chartHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  bars: { flexDirection: 'row', height: 88, gap: 8 },
  barTrack: { flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 5 },
  labels: { flexDirection: 'row', gap: 8, marginTop: -6 },
  label: { flex: 1, textAlign: 'center' },
});
