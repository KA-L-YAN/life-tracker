import { StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Tap } from '@/components/ui/tap';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  icon: IconName;
  onPress: () => void;
  label: string;
  /** 'fog' draws a round disc behind the icon; 'bare' is icon-only. */
  variant?: 'fog' | 'bare';
  color?: string;
  size?: number;
  disabled?: boolean;
};

/** 44pt target everywhere (Apple's minimum), even when the visible disc is smaller. */
export function IconButton({ icon, onPress, label, variant = 'fog', color, size = 18, disabled }: Props) {
  const theme = useTheme();
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      scaleTo={0.88}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.base, variant === 'fog' && { backgroundColor: theme.fog }]}>
      <Icon name={icon} color={color ?? theme.text} size={size} weight="bold" />
    </Tap>
  );
}

const styles = StyleSheet.create({
  base: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
