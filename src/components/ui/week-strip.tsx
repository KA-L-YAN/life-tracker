import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { Tap } from '@/components/ui/tap';
import { Hues, Radius, Spacing, Tracker } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, isFuture, isSameDay, localDateString, startOfWeek } from '@/lib/day';
import { useThemeMode } from '@/lib/theme-mode';

type Props = {
  day: Date;
  onChange: (day: Date) => void;
  /** YYYY-MM-DD dates with activity, marked with a dot under the date. */
  marked?: Set<string>;
};

/** Calendar week, Monday first. The selected day is solid; today is outlined; activity is a dot. */
export function WeekStrip({ day, onChange, marked }: Props) {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const weekStart = startOfWeek(day);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date()));
  const onToday = isSameDay(day, new Date());

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <ThemedText type="smallStrong" themeColor="textSecondary">
          {weekStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </ThemedText>
        <View style={styles.arrows}>
          {!onToday && (
            <Tap onPress={() => onChange(new Date())} scaleTo={0.94} accessibilityRole="button" style={[styles.today, { backgroundColor: theme.fog }]}>
              <ThemedText type="caption" themeColor="text">
                Today
              </ThemedText>
            </Tap>
          )}
          <IconButton icon="chevronLeft" label="Previous week" size={16} variant="bare" onPress={() => onChange(addDays(day, -7))} />
          <IconButton
            icon="chevronRight"
            label="Next week"
            size={16}
            variant="bare"
            disabled={isCurrentWeek}
            onPress={() => {
              const next = addDays(day, 7);
              onChange(isFuture(next) ? new Date() : next);
            }}
          />
        </View>
      </View>

      <View style={styles.row}>
        {days.map((d) => {
          const selected = isSameDay(d, day);
          const today = isSameDay(d, new Date());
          const future = isFuture(d);
          const done = marked?.has(localDateString(d));
          return (
            <Tap
              key={d.toISOString()}
              onPress={() => onChange(d)}
              disabled={future}
              scaleTo={0.9}
              accessibilityLabel={d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              accessibilityState={{ selected }}
              containerStyle={styles.slot}
              style={styles.col}>
              <ThemedText type="caption" themeColor={selected ? 'text' : 'textTertiary'}>
                {d.toLocaleDateString(undefined, { weekday: 'narrow' })}
              </ThemedText>
              <View
                style={[
                  styles.date,
                  selected && { backgroundColor: theme.text },
                  today && !selected && { borderWidth: 1.5, borderColor: theme.text },
                ]}>
                <ThemedText type="bodyStrong" color={selected ? theme.inverse : theme.text} style={styles.num}>
                  {d.getDate()}
                </ThemedText>
              </View>
              <View style={[styles.dot, { backgroundColor: done ? Hues[scheme][Tracker.habit] : 'transparent' }]} />
            </Tap>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrows: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  today: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, marginRight: Spacing.one },
  row: { flexDirection: 'row' },
  slot: { flex: 1 },
  col: { alignItems: 'center', gap: 4, paddingVertical: 2 },
  date: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  num: { fontVariant: ['tabular-nums'] },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
