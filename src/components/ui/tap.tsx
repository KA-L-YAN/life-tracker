import { MotiView } from 'moti';
import { type PropsWithChildren, useState } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Motion } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = PropsWithChildren<
  Omit<PressableProps, 'style' | 'children'> & {
    style?: StyleProp<ViewStyle>;
    /** Layout for the outer pressable (flex, width) — `style` styles the squashing surface. */
    containerStyle?: StyleProp<ViewStyle>;
    /** How far it squashes on press. */
    scaleTo?: number;
  }
>;

const isWeb = Platform.OS === 'web';

/**
 * Pressable that physically squashes under the finger — the app's one press-feedback language.
 * On the web it also lifts slightly under the pointer and shows a keyboard focus ring;
 * with Reduce Motion on, feedback is a dim instead of a squash.
 */
export function Tap({ style, containerStyle, scaleTo = 0.96, children, disabled, ...rest }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const scale = reduceMotion ? 1 : pressed ? scaleTo : hovered ? 1.015 : 1;
  const opacity = disabled ? 0.45 : reduceMotion && pressed ? 0.7 : 1;

  return (
    <Pressable
      {...rest}
      style={[containerStyle, isWeb && focused && { outlineColor: theme.accent, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2, borderRadius: 16 } as ViewStyle]}
      disabled={disabled}
      onHoverIn={(e) => {
        setHovered(true);
        rest.onHoverIn?.(e);
      }}
      onHoverOut={(e) => {
        setHovered(false);
        rest.onHoverOut?.(e);
      }}
      onFocus={(e) => {
        // Ring for keyboard focus only (the browser's :focus-visible), never after a click.
        const target = e.target as unknown as { matches?: (selector: string) => boolean } | null;
        setFocused(isWeb && !!target?.matches?.(':focus-visible'));
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        rest.onBlur?.(e);
      }}
      onPressIn={(e) => {
        setPressed(true);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        rest.onPressOut?.(e);
      }}>
      <MotiView animate={{ scale, opacity }} transition={Motion.press} style={style}>
        {children}
      </MotiView>
    </Pressable>
  );
}
