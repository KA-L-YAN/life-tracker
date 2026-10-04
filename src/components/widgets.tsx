import { MotiView } from 'moti';
import { type PropsWithChildren, useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Easing, useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Tap } from '@/components/ui/tap';
import { Hues, Radius, Spacing, Tints, Tracker } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/lib/theme-mode';

type Tile = (typeof Tracker)[keyof typeof Tracker];

type ShellProps = PropsWithChildren<{
  tile: Tile;
  icon: IconName;
  title: string;
  onPress: () => void;
  label: string;
  /** Span both columns; 'fill' when a wrapper already sizes it. */
  slot?: 'half' | 'wide' | 'fill';
  /** Paint a custom background instead of the tint gradient (sleep's night sky). */
  background?: React.ReactNode;
  /** Title colour on custom backgrounds. */
  ink?: string;
  /** Card colour under the background, shown before it's measured. */
  base?: string;
}>;

/**
 * A home-screen-widget style banner: its tracker's tint washing into the surface, a big faint
 * watermark icon, and one glanceable number. The whole banner opens the tracker.
 */
function Shell({ tile, icon, title, onPress, label, slot = 'half', background, ink, base, children }: ShellProps) {
  const wide = slot === 'wide';
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const id = 'w' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const hue = Hues[scheme][tile];
  return (
    <Tap onPress={onPress} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={label} containerStyle={slot === 'fill' ? styles.fillSlot : wide ? styles.wide : styles.half} style={[styles.shell, { backgroundColor: base ?? theme.surface }]}>
      {background ?? (
        <Backdrop>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={Tints[scheme][tile]} stopOpacity={1} />
              <Stop offset="1" stopColor={theme.surface} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill={`url(#${id})`} />
        </Backdrop>
      )}
      <View style={styles.watermark} pointerEvents="none">
        <Icon name={icon} size={wide ? 120 : 96} color={ink ?? hue} weight="duotone" />
      </View>
      <View style={styles.head}>
        <Icon name={icon} size={16} color={ink ?? hue} weight="fill" />
        <ThemedText type="caption" color={ink ?? theme.textSecondary}>
          {title}
        </ThemedText>
      </View>
      {children}
    </Tap>
  );
}

/**
 * Fills its card with a 100×100 drawing stretched to the card's size. Measured in pixels because
 * Android sizes a percentage-sized Svg once and misses the card growing, leaving bare strips.
 */
function Backdrop({ children }: PropsWithChildren) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size && (
        <Svg width={size.w} height={size.h} preserveAspectRatio="none" viewBox="0 0 100 100">
          {children}
        </Svg>
      )}
    </View>
  );
}

export function WidgetGrid({ children }: PropsWithChildren) {
  return <View style={styles.grid}>{children}</View>;
}

// Steps --------------------------------------------------------------------------------------------

export function StepsWidget({ steps, goal, hourly, extra, onPress }: { steps: number; goal: number; hourly: number[]; extra?: string; onPress: () => void }) {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const hue = Hues[scheme][Tracker.steps];
  const [w, setW] = useState(0);
  const max = Math.max(1, ...hourly);
  const h = 44;
  const line = hourly.map((n, i) => `${i === 0 ? 'M' : 'L'} ${(i / 23) * w} ${h - (n / max) * (h - 4)}`).join(' ');
  return (
    <Shell tile={Tracker.steps} icon="steps" title="Steps" slot="wide" onPress={onPress} label={`${steps.toLocaleString()} of ${goal.toLocaleString()} steps`}>
      <View style={styles.row}>
        <ThemedText type="hero" style={styles.tabular}>
          {steps.toLocaleString()}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.of}>
          / {goal.toLocaleString()}
        </ThemedText>
      </View>
      <View style={[styles.bar, { backgroundColor: theme.fog }]}>
        <View style={[styles.fill, { width: `${Math.min(100, (steps / goal) * 100)}%`, backgroundColor: hue }]} />
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: h }}>
        {w > 0 && hourly.some(Boolean) ? (
          <Svg width={w} height={h}>
            <Path d={`${line} L ${w} ${h} L 0 ${h} Z`} fill={hue} opacity={0.18} />
            <Path d={line} stroke={hue} strokeWidth={2} fill="none" strokeLinejoin="round" />
          </Svg>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {extra ?? 'Your walking by the hour shows up here.'}
          </ThemedText>
        )}
      </View>
      {extra && hourly.some(Boolean) && (
        <ThemedText type="caption" themeColor="textSecondary">
          {extra}
        </ThemedText>
      )}
    </Shell>
  );
}

// Water --------------------------------------------------------------------------------------------

/** A glass that fills: a gently moving wave rises to the share of today's goal. */
export function WaterWidget({ glasses, goal, onPress, onAdd }: { glasses: number; goal: number; onPress: () => void; onAdd: () => void }) {
  const { scheme } = useThemeMode();
  const reduceMotion = useReducedMotion();
  const hue = Hues[scheme][Tracker.water];
  const [size, setSize] = useState({ w: 0, h: 0 });
  const level = Math.min(1, glasses / goal);
  const waveW = size.w || 1;
  const top = size.h * (1 - level * 0.92) - 6;
  const wave = (y: number) => {
    let d = `M 0 ${y}`;
    for (let x = 0; x <= waveW * 2; x += waveW / 8) d += ` L ${x} ${y + Math.sin((x / waveW) * Math.PI * 2) * 5}`;
    return `${d} L ${waveW * 2} ${size.h + 10} L 0 ${size.h + 10} Z`;
  };
  return (
    <View style={styles.half}>
      <Shell
        tile={Tracker.water}
        icon="water"
        title="Water"
        slot="fill"
        onPress={onPress}
        label={`${glasses} of ${goal} glasses of water`}
        background={
          <View style={StyleSheet.absoluteFill} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            {size.w > 0 && level > 0 && (
              <MotiView
                from={{ translateX: 0 }}
                animate={{ translateX: reduceMotion ? 0 : -waveW }}
                transition={reduceMotion ? { type: 'timing', duration: 0 } : { type: 'timing', duration: 3200, easing: Easing.linear, loop: true, repeatReverse: false }}
                style={[StyleSheet.absoluteFill, { width: waveW * 2 }]}>
                <Svg width={waveW * 2} height={size.h}>
                  <Path d={wave(top)} fill={hue} opacity={0.22} />
                  <Path d={wave(top + 6)} fill={hue} opacity={0.3} />
                </Svg>
              </MotiView>
            )}
          </View>
        }>
        <View style={styles.row}>
          <ThemedText type="hero" style={styles.tabular}>
            {glasses}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.of}>
            / {goal}
          </ThemedText>
        </View>
        <ThemedText type="caption" themeColor="textSecondary">
          {glasses >= goal ? 'Goal reached' : 'glasses today'}
        </ThemedText>
      </Shell>
      {/* A sibling, not a child: a button inside the banner's button isn't allowed on web. */}
      <Tap onPress={onAdd} scaleTo={0.88} accessibilityRole="button" accessibilityLabel="Add a glass of water" containerStyle={styles.corner} style={[styles.add, { backgroundColor: hue }]}>
        <Icon name="add" size={18} color="#FFFFFF" weight="bold" />
      </Tap>
    </View>
  );
}

// Sleep --------------------------------------------------------------------------------------------

const NIGHT = ['#171B45', '#2E1E4F'];
const STARS = [
  [14, 18, 1.2],
  [30, 10, 0.8],
  [52, 22, 1],
  [70, 12, 1.4],
  [84, 30, 0.9],
  [22, 40, 0.7],
  [62, 44, 0.8],
  [90, 8, 0.7],
] as const;

/** Always a night sky, in both themes: sleep is the one banner that owns the dark. */
export function SleepWidget({ minutes, window, goal, onPress }: { minutes: number; window?: string; goal: number; onPress: () => void }) {
  const id = 'n' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return (
    <Shell
      tile={Tracker.sleep}
      icon="night"
      title="Sleep"
      ink="#E6E3FF"
      base={NIGHT[0]}
      onPress={onPress}
      label={minutes ? `Slept ${h} hours ${m} minutes` : 'Log last night’s sleep'}
      background={
        <Backdrop>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={NIGHT[0]} />
              <Stop offset="1" stopColor={NIGHT[1]} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill={`url(#${id})`} />
          {STARS.map(([x, y, r]) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#FFFFFF" opacity={0.7} />
          ))}
        </Backdrop>
      }>
      {minutes ? (
        <View style={styles.row}>
          <ThemedText type="hero" color="#FFFFFF" style={styles.tabular}>
            {h}
          </ThemedText>
          <ThemedText type="title" color="#FFFFFF" style={styles.unit}>
            h
          </ThemedText>
          <ThemedText type="hero" color="#FFFFFF" style={styles.tabular}>
            {m}
          </ThemedText>
          <ThemedText type="title" color="#FFFFFF" style={styles.unit}>
            m
          </ThemedText>
        </View>
      ) : (
        <ThemedText type="title" color="#FFFFFF">
          Log last night
        </ThemedText>
      )}
      <ThemedText type="caption" color="#C9C4F2" numberOfLines={1}>
        {window ?? `Goal ${goal / 60} h`}
      </ThemedText>
    </Shell>
  );
}

// Focus and food ------------------------------------------------------------------------------------

export function FocusWidget({ minutes, goal, onPress }: { minutes: number; goal: number; onPress: () => void }) {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const hue = Hues[scheme][Tracker.focus];
  return (
    <Shell tile={Tracker.focus} icon="focus" title="Focus" onPress={onPress} label={`${Math.round(minutes)} of ${goal} minutes of focus`}>
      <View style={styles.ringRow}>
        <ProgressRing progress={minutes / goal} size={54} stroke={7} color={hue} track={theme.fog}>
          <Icon name="play" size={16} color={hue} weight="fill" />
        </ProgressRing>
        <View>
          <ThemedText type="title" style={styles.tabular}>
            {Math.round(minutes)} min
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            of {goal}
          </ThemedText>
        </View>
      </View>
    </Shell>
  );
}

const MEAL_KEYS = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

export function FoodWidget({ count, last, meals, onPress }: { count: number; last?: string; meals: Set<string>; onPress: () => void }) {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const hue = Hues[scheme][Tracker.food];
  return (
    <Shell tile={Tracker.food} icon="food" title="Food" onPress={onPress} label={`${count} things eaten today`}>
      <ThemedText type="title" numberOfLines={1}>
        {count ? `${count} logged` : 'Nothing yet'}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
        {last ?? 'Tap to log a meal'}
      </ThemedText>
      <View style={styles.meals} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {MEAL_KEYS.map((m) => (
          <View key={m} style={[styles.meal, { backgroundColor: meals.has(m) ? hue : theme.fog }]}>
            <ThemedText type="caption" color={meals.has(m) ? '#FFFFFF' : theme.textTertiary}>
              {m[0].toUpperCase()}
            </ThemedText>
          </View>
        ))}
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  wide: { width: '100%' },
  half: { flexGrow: 1, flexBasis: '44%', minWidth: 0 },
  fillSlot: { flex: 1 },
  shell: { borderRadius: Radius.sheet - 4, overflow: 'hidden', padding: Spacing.three, gap: 6, minHeight: 148 },
  watermark: { position: 'absolute', right: -14, bottom: -18, opacity: 0.12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  of: { marginLeft: 2 },
  unit: { marginRight: 6 },
  tabular: { fontVariant: ['tabular-nums'] },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  meals: { flexDirection: 'row', gap: 6, marginTop: 'auto' },
  meal: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', top: 10, right: 10 },
  add: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
