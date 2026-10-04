import { MotiView } from 'moti';
import { StyleSheet, View } from 'react-native';
import { Easing, useReducedMotion } from 'react-native-reanimated';

import { Hues } from '@/constants/theme';
import { useThemeMode } from '@/lib/theme-mode';

const COUNT = 28;
const GOLDEN = 137.508; // degrees: spreads pieces evenly without randomness (render stays pure)

/**
 * A one-second burst from the centre of its parent, for finishing every habit or hitting a goal.
 * Bump `burst` to fire it again. Skipped entirely under reduced motion.
 */
export function Confetti({ burst }: { burst: number }) {
  const { scheme } = useThemeMode();
  const reduceMotion = useReducedMotion();
  if (!burst || reduceMotion) return null;
  const colors = Object.values(Hues[scheme]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      {Array.from({ length: COUNT }, (_, i) => {
        const angle = ((i * GOLDEN) % 360) * (Math.PI / 180);
        const reach = 90 + ((i * 37) % 70);
        const w = i % 3 === 0 ? 10 : 7;
        return (
          <MotiView
            key={`${burst}-${i}`}
            from={{ translateX: 0, translateY: 0, opacity: 1, rotate: '0deg', scale: 0.6 }}
            animate={{
              translateX: Math.cos(angle) * reach,
              translateY: Math.sin(angle) * reach + 60, // a little gravity
              opacity: 0,
              rotate: `${(i % 2 ? 1 : -1) * (180 + i * 12)}deg`,
              scale: 1,
            }}
            transition={{ type: 'timing', duration: 1100 + (i % 5) * 60, easing: Easing.out(Easing.cubic) }}
            style={[styles.piece, { width: w, height: i % 3 === 0 ? 10 : 14, borderRadius: i % 3 === 0 ? 5 : 2, backgroundColor: colors[i % colors.length] }]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  piece: { position: 'absolute' },
});
