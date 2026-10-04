import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Tap } from '@/components/ui/tap';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Grow to share leftover row space with sibling chips; never narrower than the label. */
  fill?: boolean;
};

/** Selection is shown by ink fill, not a new colour. */
export function Chip({ label, selected, onPress, fill }: Props) {
  const theme = useTheme();
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      containerStyle={fill && styles.fill}
      style={[styles.chip, { backgroundColor: selected ? theme.text : theme.fog }]}>
      <ThemedText type="smallStrong" color={selected ? theme.inverse : theme.text} numberOfLines={1}>
        {label}
      </ThemedText>
    </Tap>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { flexGrow: 1 },
});
