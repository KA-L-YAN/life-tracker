import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';

type Props = {
  value: number;
  onChange: (value: number) => void;
  step: number;
  min: number;
  max: number;
  /** How the value reads, e.g. "8,000 steps" or "11:30 pm". */
  format: (value: number) => string;
  label: string;
  /** Treat min..max as a circle (clock times, where max itself is excluded). */
  wrap?: boolean;
};

/** − value +, for goals and clock times: no keyboard, no picker sheet. */
export function Stepper({ value, onChange, step, min, max, format, label, wrap }: Props) {
  const next = (dir: 1 | -1) => {
    const v = value + dir * step;
    // Wrapping treats [min, max) as a circle, so 11:45 pm + 15 min is 12:00 am.
    if (wrap) return ((((v - min) % (max - min)) + (max - min)) % (max - min)) + min;
    return Math.min(max, Math.max(min, v));
  };
  return (
    <View style={styles.row} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: format(value) }}>
      <IconButton icon="minus" label={`Less ${label.toLowerCase()}`} size={16} disabled={!wrap && value <= min} onPress={() => onChange(next(-1))} />
      <ThemedText type="bodyStrong" style={styles.value} numberOfLines={1}>
        {format(value)}
      </ThemedText>
      <IconButton icon="add" label={`More ${label.toLowerCase()}`} size={16} disabled={!wrap && value >= max} onPress={() => onChange(next(1))} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { minWidth: 92, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
