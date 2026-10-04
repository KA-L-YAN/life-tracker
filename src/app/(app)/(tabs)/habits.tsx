import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { QuitRow, useHabitColors } from '@/components/habits/habit-row';
import { ThemedText } from '@/components/themed-text';
import { Blob, BlobColors } from '@/components/ui/blob';
import { Button } from '@/components/ui/button';
import { Group, Row } from '@/components/ui/group';
import { Icon, IconBadge, isIconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Screen, Section } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useHabits } from '@/hooks/use-habits';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import type { Habit } from '@/lib/api/habits';
import { addDays, localDateString } from '@/lib/day';
import { bestStreak, countsByDay, currentStreak, daysClean, logDays } from '@/lib/habit-stats';

export default function HabitsScreen() {
  const { data, isLoading, error, refetch } = useHabits();
  const { twoUp } = useLayout();
  const theme = useTheme();
  const build = data?.habits.filter((h) => h.kind === 'build') ?? [];
  const quit = data?.habits.filter((h) => h.kind === 'quit') ?? [];
  const open = (id: string) => router.push({ pathname: '/habit/[id]', params: { id } });

  const building = (
    <Section title="Building" style={styles.col}>
      <Group>
        {build.map((habit) => (
          <BuildRow key={habit.id} habit={habit} days={logDays(data?.logs ?? [], habit.id)} onPress={() => open(habit.id)} />
        ))}
        <Row
          title="New habit"
          titleColor={theme.accent}
          leading={
            <View style={[styles.plus, { backgroundColor: theme.fog }]}>
              <Icon name="add" size={18} color={theme.accent} weight="bold" />
            </View>
          }
          onPress={() => router.push('/habit/new')}
        />
      </Group>
    </Section>
  );

  const quitting = quit.length > 0 && (
    <Section title="Quitting" style={styles.col}>
      <Group>
        {quit.map((habit) => (
          <QuitRow
            key={habit.id}
            habit={habit}
            daysClean={daysClean(data?.lastSlip[habit.id] ?? null, habit.created_at)}
            slipsToday={countsByDay(data?.logs ?? [], 1, habit.id).at(-1)?.count ?? 0}
            onChange={refetch}
            onOpen={() => open(habit.id)}
          />
        ))}
      </Group>
    </Section>
  );

  return (
    <Screen title="Habits" subtitle="Open one for its streaks and history" tabbed right={<IconButton icon="add" label="New habit" onPress={() => router.push('/habit/new')} />}>
      {!isLoading && data && data.habits.length === 0 && (
        <View style={styles.empty}>
          <Blob shape="round" color={BlobColors.lime} size={88} mood="wow" />
          <ThemedText type="title">No habits yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            Start with one small thing you want to do every day, or one you want to stop.
          </ThemedText>
          <Button label="Create a habit" icon="add" onPress={() => router.push('/habit/new')} />
        </View>
      )}

      {data && data.habits.length > 0 && (
        <View style={twoUp ? styles.twoUp : styles.stack}>
          {building}
          {quitting}
        </View>
      )}

      {error && (
        <ThemedText type="small" color={theme.danger}>
          {error}
        </ThemedText>
      )}
    </Screen>
  );
}

/** Name, streak, and the last seven days as a row of small squares in the habit's hue. */
function BuildRow({ habit, days, onPress }: { habit: Habit; days: Set<string>; onPress: () => void }) {
  const theme = useTheme();
  const { hue, tint } = useHabitColors(habit);
  const streak = currentStreak(days);
  const week = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 6));
  const doneThisWeek = week.filter((d) => days.has(localDateString(d))).length;

  return (
    <Row
      title={habit.name}
      subtitle={streak > 0 ? `${streak}-day streak, best ${bestStreak(days)}` : 'No streak yet'}
      leading={<IconBadge name={isIconName(habit.icon) ? habit.icon : 'sparkles'} size={40} hue={hue} tint={tint} />}
      trailing={
        <View style={styles.week} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {week.map((d) => (
            <View key={d.toISOString()} style={[styles.square, { backgroundColor: days.has(localDateString(d)) ? hue : theme.fog }]} />
          ))}
        </View>
      }
      chevron
      onPress={onPress}
      accessibilityLabel={`${habit.name}, ${streak}-day streak, ${doneThisWeek} of the last 7 days`}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  empty: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.five },
  stack: { gap: Spacing.four },
  twoUp: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.four },
  col: { flex: 1, minWidth: 0 },
  week: { flexDirection: 'row', gap: 3 },
  square: { width: 9, height: 9, borderRadius: 3 },
  plus: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
