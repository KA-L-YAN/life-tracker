import { MotiView } from 'moti';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, IconBadge, isIconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Tap } from '@/components/ui/tap';
import { useToast } from '@/components/ui/toast';
import { Hues, Motion, Radius, Spacing, Tints, type TileColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addLog, deleteLog, type Habit } from '@/lib/api/habits';
import { isAutoRule, shortRule } from '@/lib/auto';
import { useThemeMode } from '@/lib/theme-mode';

export function tileOf(color: string): TileColor {
  return color in Hues.light ? (color as TileColor) : 'lime';
}

/** The habit's hue and its soft tint, for the current scheme. */
export function useHabitColors(habit: Pick<Habit, 'color'>) {
  const { scheme } = useThemeMode();
  const tile = tileOf(habit.color);
  return { hue: Hues[scheme][tile], tint: Tints[scheme][tile] };
}

type BuildProps = {
  habit: Habit;
  done: boolean;
  streak: number;
  onToggle: () => void;
  onOpen: () => void;
  disabled?: boolean;
};

/**
 * One row of a grouped list, Reminders-style: the whole row ticks the day off, the chevron opens
 * the habit. The check fills with the habit's own hue, so colour means "done", not decoration.
 */
export function HabitRow({ habit, done, streak, onToggle, onOpen, disabled }: BuildProps) {
  const theme = useTheme();
  const { hue } = useHabitColors(habit);
  const rule = isAutoRule(habit.auto) ? habit.auto : null;
  return (
    <View style={styles.row}>
      <Tap
        onPress={onToggle}
        onLongPress={onOpen}
        disabled={disabled}
        scaleTo={0.985}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={habit.name}
        accessibilityHint="Long press for details"
        containerStyle={styles.fill}
        style={styles.main}>
        <View style={styles.lead}>
          <MotiView
            animate={{ scale: done ? 1 : 0.94, backgroundColor: done ? hue : 'transparent' }}
            transition={Motion.pop}
            style={[styles.check, { borderColor: done ? hue : theme.textTertiary }]}>
            {done && <Icon name="check" color="#FFFFFF" size={16} weight="bold" />}
          </MotiView>
        </View>
        <View style={styles.text}>
          <ThemedText type="body" color={done ? theme.textSecondary : theme.text} numberOfLines={1}>
            {habit.name}
          </ThemedText>
          {rule && !done ? (
            <View style={styles.auto}>
              <Icon name="auto" size={13} color={theme.accent} weight="fill" />
              <ThemedText type="small" color={theme.accent} numberOfLines={1}>
                Auto at {shortRule(rule)}
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="small" color={streak > 1 ? hue : theme.textTertiary} numberOfLines={1} style={styles.tabular}>
              {streak > 1 ? `${streak}-day streak` : habit.note || (done ? 'Done today' : 'Not yet today')}
            </ThemedText>
          )}
        </View>
        <Icon name={isIconName(habit.icon) ? habit.icon : 'sparkles'} size={20} color={done ? hue : theme.textTertiary} weight={done ? 'fill' : 'regular'} />
      </Tap>
      <IconButton icon="chevronRight" label={`Open ${habit.name}`} variant="bare" size={16} color={theme.textTertiary} onPress={onOpen} />
    </View>
  );
}

type QuitProps = {
  habit: Habit;
  daysClean: number;
  slipsToday: number;
  onChange: () => void;
  onOpen: () => void;
};

/** A quit habit counts days clean instead of ticking. Slips log in one tap and undo from the toast. */
export function QuitRow({ habit, daysClean, slipsToday, onChange, onOpen }: QuitProps) {
  const theme = useTheme();
  const { hue, tint } = useHabitColors(habit);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function slip() {
    setBusy(true);
    try {
      const id = await addLog(habit.id);
      onChange();
      toast('Slip logged. The count starts again.', {
        label: 'Undo',
        onPress: () => deleteLog(id).then(onChange),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.row}>
      <Tap
        onPress={onOpen}
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityLabel={`${habit.name}, ${daysClean} ${daysClean === 1 ? 'day' : 'days'} clean`}
        containerStyle={styles.fill}
        style={styles.main}>
        <IconBadge name={isIconName(habit.icon) ? habit.icon : 'flame'} size={40} hue={hue} tint={tint} />
        <View style={styles.text}>
          <ThemedText type="body" numberOfLines={2}>
            {habit.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textTertiary" numberOfLines={1}>
            {slipsToday === 0 ? 'No slips today' : `${slipsToday} ${slipsToday === 1 ? 'slip' : 'slips'} today`}
          </ThemedText>
        </View>
        <View style={styles.count}>
          <MotiView key={daysClean} from={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={Motion.pop}>
            <ThemedText type="title" color={hue} style={styles.tabular}>
              {daysClean}
            </ThemedText>
          </MotiView>
          <ThemedText type="caption" themeColor="textTertiary">
            {daysClean === 1 ? 'day clean' : 'days clean'}
          </ThemedText>
        </View>
      </Tap>
      <Tap
        onPress={slip}
        disabled={busy}
        scaleTo={0.94}
        accessibilityRole="button"
        accessibilityLabel={`Log a slip for ${habit.name}`}
        style={[styles.slip, { backgroundColor: theme.fog }]}>
        <ThemedText type="caption" themeColor="text">
          Slip
        </ThemedText>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: Spacing.two },
  main: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: Spacing.three, paddingRight: Spacing.two, paddingVertical: 12, minHeight: 60 },
  text: { flex: 1, minWidth: 0, gap: 1 },
  lead: { width: 40, alignItems: 'center' },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  count: { alignItems: 'flex-end' },
  auto: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tabular: { fontVariant: ['tabular-nums'] },
  slip: { paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: Radius.pill, marginLeft: Spacing.one },
});
