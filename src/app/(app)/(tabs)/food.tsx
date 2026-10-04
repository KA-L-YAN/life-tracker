import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Blob, BlobColors } from '@/components/ui/blob';
import { Group, Row } from '@/components/ui/group';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Screen, Section } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Tap } from '@/components/ui/tap';
import { useToast } from '@/components/ui/toast';
import { WeekStrip } from '@/components/ui/week-strip';
import { Fonts, Hues, Radius, Spacing, Tints, Tracker } from '@/constants/theme';
import { useAsyncData } from '@/hooks/use-async-data';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { addFoodEntry, deleteFoodEntry, type FoodEntry, listFoodEntries, listFoodEntriesBetween, type Meal, MEALS, mealForHour, restoreFoodEntry } from '@/lib/api/food';
import { addDays, formatDayLabel, isSameDay } from '@/lib/day';
import { errorMessage } from '@/lib/errors';
import { usuals } from '@/lib/food-usuals';
import { useThemeMode } from '@/lib/theme-mode';

const loadHistory = () => listFoodEntriesBetween(addDays(new Date(), -60), addDays(new Date(), 1));

export default function FoodScreen() {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const { twoUp } = useLayout();
  const toast = useToast();
  const { compose } = useLocalSearchParams<{ compose?: string }>();
  const [day, setDay] = useState(() => new Date());
  const [meal, setMeal] = useState<Meal>(() => mealForHour(new Date().getHours()));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetcher = useCallback(() => listFoodEntries(day), [day]);
  const { data: entries, refetch } = useAsyncData(fetcher);
  // The last two months of meals, for one-tap "usuals".
  const history = useAsyncData(loadHistory);
  const favourites = usuals(history.data ?? [], meal);
  const isToday = isSameDay(day, new Date());

  async function add(text = note) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      await addFoodEntry(trimmed, meal, day);
      if (text === note) setNote('');
      await Promise.all([refetch(), history.refetch()]);
    } catch (err) {
      setError(errorMessage(err, 'Couldn’t save that. Try again.'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(entry: FoodEntry) {
    await deleteFoodEntry(entry.id);
    refetch();
    toast(`Removed ${entry.note}`, { label: 'Undo', onPress: () => restoreFoodEntry(entry).then(refetch) });
  }

  // Older entries predate meal types — file them by the hour they were logged.
  const mealOf = (e: FoodEntry): Meal => e.meal ?? mealForHour(new Date(e.logged_at).getHours());
  const groups = MEALS.map((m) => ({ ...m, items: (entries ?? []).filter((e) => mealOf(e) === m.key) })).filter((g) => g.items.length > 0);
  const hue = Hues[scheme][Tracker.food];

  const composer = (
    <View style={[styles.composer, { backgroundColor: theme.surface }]}>
      <Segmented label="Meal" value={meal} onChange={setMeal} options={MEALS} />
      <View style={[styles.inputRow, { backgroundColor: theme.fog }]}>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={isToday ? 'What did you eat?' : `What did you eat on ${day.toLocaleDateString(undefined, { weekday: 'long' })}?`}
          placeholderTextColor={theme.textTertiary}
          accessibilityLabel={`What you ate for ${meal}`}
          autoFocus={compose === '1'}
          onSubmitEditing={() => add()}
          returnKeyType="done"
          maxLength={140}
          style={[styles.input, { color: theme.text }]}
        />
        <Tap
          onPress={() => add()}
          disabled={saving || !note.trim()}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel="Add food"
          style={[styles.addButton, { backgroundColor: theme.accent }]}>
          <Icon name="add" color={theme.onAccent} size={20} weight="bold" />
        </Tap>
      </View>
      {favourites.length > 0 && (
        <View style={styles.usuals}>
          <ThemedText type="caption" themeColor="textTertiary">
            Your usuals, one tap to log
          </ThemedText>
          <View style={styles.usualRow}>
            {favourites.map((f) => (
              <Tap
                key={f}
                onPress={() => add(f)}
                disabled={saving}
                scaleTo={0.94}
                accessibilityRole="button"
                accessibilityLabel={`Log ${f}`}
                style={[styles.usual, { backgroundColor: Tints[scheme][Tracker.food] }]}>
                <Icon name="add" size={12} color={hue} weight="bold" />
                <ThemedText type="caption" themeColor="text" numberOfLines={1}>
                  {f}
                </ThemedText>
              </Tap>
            ))}
          </View>
        </View>
      )}
      {error && (
        <ThemedText type="small" color={theme.danger}>
          {error}
        </ThemedText>
      )}
    </View>
  );

  const list =
    entries && entries.length === 0 ? (
      <View style={styles.empty}>
        <Blob shape="cloud" color={BlobColors[Tracker.food]} size={72} mood="calm" />
        <ThemedText type="bodyStrong">{isToday ? 'Nothing logged today' : `Nothing logged ${formatDayLabel(day) === 'Yesterday' ? 'yesterday' : `on ${formatDayLabel(day)}`}`}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Pick a meal, type what you had, and tap +.
        </ThemedText>
      </View>
    ) : (
      <View style={styles.groups}>
        {groups.map((g) => (
          <Animated.View key={g.key} layout={LinearTransition} entering={FadeIn}>
            <Section
              title={g.label}
              action={
                <ThemedText type="small" themeColor="textTertiary" style={styles.tabular}>
                  {g.items.length}
                </ThemedText>
              }>
              <Group>
                {g.items.map((item) => (
                  <Row
                    key={item.id}
                    title={item.note}
                    subtitle={new Date(item.logged_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    leading={<View style={[styles.mark, { backgroundColor: hue }]} />}
                    trailing={<IconButton icon="trash" label={`Delete ${item.note}`} variant="bare" color={theme.textTertiary} size={17} onPress={() => remove(item)} />}
                  />
                ))}
              </Group>
            </Section>
          </Animated.View>
        ))}
      </View>
    );

  return (
    <Screen title="Food" subtitle={formatDayLabel(day)} tabbed>
      <WeekStrip day={day} onChange={setDay} />
      {twoUp ? (
        <View style={styles.twoUp}>
          <View style={styles.col}>{composer}</View>
          <View style={styles.col}>{list}</View>
        </View>
      ) : (
        <>
          {composer}
          {list}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  twoUp: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.four },
  col: { flex: 1, minWidth: 0 }, // only used side by side
  composer: { borderRadius: Radius.large, padding: 12, gap: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Radius.medium, paddingLeft: Spacing.three, padding: 5 },
  input: { flex: 1, minHeight: 44, fontSize: 17, fontFamily: Fonts.regular },
  addButton: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  groups: { gap: Spacing.four },
  mark: { width: 4, height: 28, borderRadius: 2 },
  usuals: { gap: 6, paddingHorizontal: 4 },
  usualRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  usual: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, minHeight: 34, borderRadius: Radius.pill, maxWidth: 220 },
});
