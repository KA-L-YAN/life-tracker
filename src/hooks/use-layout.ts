import { useWindowDimensions } from 'react-native';

import { ContentWidth, RailWidth } from '@/constants/theme';

export type LayoutSize = 'phone' | 'tablet' | 'desktop';

/**
 * One source of truth for responsive layout. Phones get the single column and bottom bar;
 * tablets a wider column with two-up sections; desktop a navigation rail and a real grid.
 * Breakpoints sit where the content changes, not on device names.
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const size: LayoutSize = width >= 1100 ? 'desktop' : width >= 740 ? 'tablet' : 'phone';
  const railed = size === 'desktop';
  const available = width - (railed ? RailWidth : 0);
  return {
    size,
    width,
    height,
    railed,
    /** Two panes side by side (tablet and up). */
    twoUp: size !== 'phone',
    contentWidth: Math.min(available, ContentWidth[size]),
  };
}
