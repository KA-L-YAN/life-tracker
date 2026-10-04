import { Colors } from '@/constants/theme';
import { useThemeMode } from '@/lib/theme-mode';

export function useTheme() {
  const { scheme } = useThemeMode();
  return Colors[scheme];
}
