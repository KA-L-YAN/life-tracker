import { MotiView } from 'moti';
import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Easing, useReducedMotion } from 'react-native-reanimated';

/**
 * Sections rise into place one after another when a screen first opens: one orchestrated
 * entrance, not an effect on every element. Skipped under reduced motion.
 */
export function Reveal({ index = 0, style, children }: PropsWithChildren<{ index?: number; style?: StyleProp<ViewStyle> }>) {
  const reduceMotion = useReducedMotion();
  return (
    <MotiView
      from={reduceMotion ? undefined : { opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 420, delay: index * 70, easing: Easing.out(Easing.cubic) }}
      style={style}>
      {children}
    </MotiView>
  );
}
