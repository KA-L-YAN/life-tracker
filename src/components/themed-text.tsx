import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextVariant =
  | 'number'
  | 'hero'
  | 'display'
  | 'title'
  | 'body'
  | 'bodyStrong'
  | 'small'
  | 'smallStrong'
  | 'caption';

export type ThemedTextProps = TextProps & {
  type?: TextVariant;
  themeColor?: ThemeColor;
  /** Raw color override, e.g. a data hue. Wins over themeColor. */
  color?: string;
};

// Display sizes may scale with the system text size, but only so far: a 60pt number at 200%
// breaks every layout. Reading sizes scale freely.
const SCALE_CAP: Partial<Record<TextVariant, number>> = { number: 1.2, hero: 1.25, display: 1.3, title: 1.5 };

export function ThemedText({ style, type = 'body', themeColor, color, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={SCALE_CAP[type]}
      style={[{ color: color ?? theme[themeColor ?? 'text'] }, styles[type], style]}
      {...rest}
    />
  );
}

/**
 * Apple's ladder, in our faces: Bricolage for display (tight tracking, tabular numerals so
 * counters don't jitter), Plus Jakarta for reading at 17pt, weights 400 / 600 / 700 only.
 */
const styles = StyleSheet.create({
  number: { fontFamily: Fonts.display, fontSize: 60, lineHeight: 62, letterSpacing: -1.8, fontVariant: ['tabular-nums'] },
  hero: { fontFamily: Fonts.display, fontSize: 40, lineHeight: 43, letterSpacing: -1.1, fontVariant: ['tabular-nums'] },
  display: { fontFamily: Fonts.displayBold, fontSize: 32, lineHeight: 36, letterSpacing: -0.8 },
  title: { fontFamily: Fonts.semiBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  body: { fontFamily: Fonts.regular, fontSize: 17, lineHeight: 25, letterSpacing: -0.2 },
  bodyStrong: { fontFamily: Fonts.semiBold, fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  small: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 21, letterSpacing: -0.1 },
  smallStrong: { fontFamily: Fonts.semiBold, fontSize: 15, lineHeight: 21, letterSpacing: -0.1 },
  caption: { fontFamily: Fonts.semiBold, fontSize: 13, lineHeight: 17 },
});
