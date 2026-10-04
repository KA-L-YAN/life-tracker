import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { useHabitColors } from '@/components/habits/habit-row';
import { Heatmap } from '@/components/habits/heatmap';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Group, Row } from '@/components/ui/group';
import { IconBadge, isIconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { goBack, Screen, Section } from '@/components/ui/screen';
import { useToast } from '@/components/ui/toast';
import { Radius, Spacing } from '@/constants/theme';
import { useAsyncData } from '@/hooks/use-async-data';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { addLog, archiveHabit, deleteLog, getHabit, type Habit, type HabitLog, lastLogAt, listLogsForHabit, unarchiveHabit } from '@/lib/api/habits';
import { localDateString } from '@/lib/day';
import { bestStreak, countsByDay, currentStreak, daysClean, logDays } from '@/lib/habit-stats';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fetcher = useCallback(async () => {
    const [habit, logs, last] = await Promise.all([getHabit(id), listLogsForHabit(id, 400), lastLogAt(id)]);
    return { habit, logs, last };
  }, [id]);
  const { data, refetch } = useAsyncData(fetcher);

  if (!data?.habit) return <Screen back title=" " />;
  return <Detail habit={data.habit} logs={data.logs} last={data.last} refetch={refetch} />;
}

function Detail({ habit, logs, last, refetch }: { habit: Habit; logs: HabitLog[]; last: string | null; refetch: () => void }) {
  const theme = useTheme();
  const toast = useToast();
  const { twoUp } = useLayout();
  const { hue, tint } = useHabitColors(habit);
  const days = logDays(logs);
  const isQuit = habit.kind === 'quit';
  const counts = countsByDay(logs, 14);
  const thisWeek = counts.slice(7).reduce((s, c) => s + c.count, 0);
  const lastWeek = counts.slice(0, 7).reduce((s, c) => s + c.count, 0);
  const month = countsByDay(logs, 30).filter((c) => c.count > 0).length;
  const perDay = new Map(countsByDay(logs, 26 * 7).map((c) => [c.date, c.count]));

  const hero = isQuit ? daysClean(last, habit.created_at) : currentStreak(days);
  const stats = isQuit
    ? [
        { value: thisWeek, label: 'slips this week' },
        { value: lastWeek, label: 'slips last week' },
        { value: 30 - month, label: 'clean of 30 days' },
      ]
    : [
        { value: bestStreak(days), label: 'best streak' },
        { value: month, label: 'of the last 30' },
        { value: logs.length, label: 'times in total' },
      ];
  const trend = isQuit
    ? thisWeek < lastWeek
      ? `${lastWeek - thisWeek} fewer slips than last week`
      : thisWeek === lastWeek
        ? 'Same number of slips as last week'
        : `${thisWeek - lastWeek} more slips than last week`
    : hero > 0 && hero === bestStreak(days)
      ? 'Your longest run yet'
      : `Best run so far: ${bestStreak(days)} ${bestStreak(days) === 1 ? 'day' : 'days'}`;

  async function removeLog(log: HabitLog) {
    await deleteLog(log.id);
    refetch();
    toast(isQuit ? 'Slip removed' : 'Entry removed', {
      label: 'Undo',
      onPress: () => addLog(habit.id, new Date(log.logged_at)).then(refetch),
    });
  }

  async function archive() {
    await archiveHabit(habit.id);
    goBack();
    // Undo reopens the habit, so the restore is visible rather than waiting for a list refresh.
    toast(`Stopped tracking ${habit.name}`, {
      label: 'Undo',
      onPress: () => unarchiveHabit(habit.id).then(() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })),
    });
  }

  const summary = (
    <View style={[styles.col, twoUp && styles.half]}>
      <View style={[styles.hero, { backgroundColor: theme.surface }]}>
        <View style={styles.fill}>
          <ThemedText type="number" color={hue}>
            {hero}
          </ThemedText>
          <ThemedText type="bodyStrong">{isQuit ? (hero === 1 ? 'day clean' : 'days clean') : hero === 1 ? 'day in a row' : 'days in a row'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {trend}
          </ThemedText>
        </View>
        <IconBadge name={isIconName(habit.icon) ? habit.icon : 'sparkles'} size={72} hue={hue} tint={tint} />
      </View>

      <View style={[styles.stats, { backgroundColor: theme.surface }]}>
        {stats.map((s, i) => (
          <View key={s.label} style={[styles.stat, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.border }]}>
            <ThemedText type="title">
              {s.value}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.centerText}>
              {s.label}
            </ThemedText>
          </View>
        ))}
      </View>

      {habit.note && (
        <ThemedText type="body" themeColor="textSecondary">
          {habit.note}
        </ThemedText>
      )}

      <Section title="Last six months">
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Heatmap counts={perDay} hue={hue} tint={tint} label={isQuit ? 'Slips' : habit.name} />
        </View>
      </Section>
    </View>
  );

  const history = (
    <View style={[styles.col, twoUp && styles.half]}>
      <Section title="History">
        {logs.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {isQuit ? 'No slips logged. That’s the whole idea.' : 'Nothing logged yet. Tick it off on Today.'}
          </ThemedText>
        ) : (
          <Group>
            {logs.slice(0, 20).map((log) => {
              const at = new Date(log.logged_at);
              return (
                <Row
                  key={log.id}
                  title={at.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  subtitle={at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  trailing={<IconButton icon="trash" label={`Delete entry from ${localDateString(at)}`} variant="bare" color={theme.textTertiary} size={17} onPress={() => removeLog(log)} />}
                />
              );
            })}
          </Group>
        )}
      </Section>
      <Button label="Stop tracking this habit" variant="quiet" icon="trash" onPress={archive} />
      <ThemedText type="caption" themeColor="textTertiary" style={styles.centerText}>
        Its history stays saved, and you can undo straight after.
      </ThemedText>
    </View>
  );

  return (
    <Screen
      back
      title={habit.name}
      subtitle={isQuit ? 'Quitting' : 'Building'}
      right={<IconButton icon="edit" label="Edit habit" onPress={() => router.push({ pathname: '/habit/new', params: { id: habit.id } })} />}>
      {twoUp ? (
        <View style={styles.twoUp}>
          {summary}
          {history}
        </View>
      ) : (
        <>
          {summary}
          {history}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  col: { gap: Spacing.four },
  half: { flex: 1, minWidth: 0 },
  twoUp: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.four },
  centerText: { textAlign: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Radius.sheet, padding: Spacing.four },
  stats: { flexDirection: 'row', borderRadius: Radius.large, paddingVertical: Spacing.three },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: Spacing.one },
  card: { borderRadius: Radius.large, padding: Spacing.three },
});
