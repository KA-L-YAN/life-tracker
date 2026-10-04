import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Tap } from '@/components/ui/tap';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  onPress: () => void;
  /** danger: red pill, only for the final step of something that can't be undone. */
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
};

/** Accent pill for the one main action on a screen, fog pill for the rest, accent text for links. */
export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, compact }: Props) {
  const theme = useTheme();
  const bg = { primary: theme.accent, secondary: theme.fog, quiet: 'transparent', danger: theme.danger }[variant];
  const fg = { primary: theme.onAccent, secondary: theme.text, quiet: theme.accent, danger: '#FFFFFF' }[variant];

  return (
    <Tap
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[styles.base, compact && styles.compact, { backgroundColor: bg }]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Icon name={icon} color={fg} size={compact ? 16 : 18} />}
          <ThemedText type={compact ? 'smallStrong' : 'bodyStrong'} color={fg}>
            {label}
          </ThemedText>
        </View>
      )}
    </Tap>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  compact: { minHeight: 40, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
