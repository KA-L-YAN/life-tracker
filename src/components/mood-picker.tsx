import { MotiView } from 'moti';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Tap } from '@/components/ui/tap';
import { Hues, Motion, Radius, Tints, Tracker } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MOODS, type MoodLevel } from '@/lib/api/moods';
import { useThemeMode } from '@/lib/theme-mode';

type Props = { value: MoodLevel | null; onChange: (level: MoodLevel) => void; disabled?: boolean };

/** Five faces, one tap. The chosen face fills and grows; the rest stay quiet outlines. */
export function MoodPicker({ value, onChange, disabled }: Props) {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const hue = Hues[scheme][Tracker.mood];
  const tint = Tints[scheme][Tracker.mood];

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="How are you feeling?" style={styles.row}>
      {MOODS.map((m) => {
        const selected = value === m.level;
        return (
          <Tap
            key={m.level}
            onPress={() => onChange(m.level)}
            disabled={disabled}
            scaleTo={0.9}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={m.label}
            containerStyle={styles.fill}
            style={[styles.option, { backgroundColor: selected ? tint : 'transparent' }]}>
            <MotiView animate={{ scale: selected ? 1.12 : 1 }} transition={Motion.pop}>
              <Icon name={`mood${m.level}` as IconName} size={30} color={selected ? hue : theme.textTertiary} weight={selected ? 'fill' : 'regular'} />
            </MotiView>
            <ThemedText type="caption" color={selected ? hue : theme.textSecondary} numberOfLines={1}>
              {m.label}
            </ThemedText>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  fill: { flex: 1 },
  option: { alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: Radius.medium },
});
