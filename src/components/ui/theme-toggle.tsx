import { MotiView } from 'moti';
import { StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Tap } from '@/components/ui/tap';
import { Motion, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/lib/theme-mode';

export function ThemeToggle() {
  const { scheme, toggle } = useThemeMode();
  const theme = useTheme();
  const isDark = scheme === 'dark';

  return (
    <Tap
      onPress={toggle}
      hitSlop={8}
      scaleTo={0.88}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={[styles.button, { backgroundColor: theme.fog }]}>
      <MotiView key={scheme} from={{ rotate: '-120deg', scale: 0.4 }} animate={{ rotate: '0deg', scale: 1 }} transition={Motion.pop}>
        <Icon name={isDark ? 'moon' : 'sun'} color={theme.text} size={18} />
      </MotiView>
    </Tap>
  );
}

const styles = StyleSheet.create({
  button: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
