import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { type ReactNode, useRef, useState } from 'react';
import { type GestureResponderEvent, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Hues, Motion, Tracker } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/lib/theme-mode';

export type DialEvent =
  | { kind: 'focus' | 'route' | 'sleep' | 'workout'; start: Date; end: Date; label?: string }
  | { kind: 'meal' | 'habit' | 'slip' | 'mood' | 'water'; at: Date; label?: string };

type Props = {
  events: DialEvent[];
  /** Steps per local hour (24 values), drawn as a ring of bars. */
  steps?: number[];
  size: number;
  /** Draw the "now" hand (only when looking at today). */
  now?: Date;
  /** Told the hour being explored (or null when let go), e.g. to recolour the sky. */
  onScrub?: (hours: number | null) => void;
  /** True while a finger is scrubbing: lock the page's scrolling meanwhile. */
  onHoldChange?: (held: boolean) => void;
  children?: ReactNode;
};

const hoursOf = (d: Date) => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
/** Midnight at the top, clockwise, like a 24-hour watch. */
const angleOf = (hours: number) => (hours / 24) * 360 - 90;
const polar = (c: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: c + r * Math.cos(rad), y: c + r * Math.sin(rad) };
};

function arc(c: number, r: number, fromHours: number, toHours: number) {
  const span = Math.max(0.05, Math.min(24, toHours - fromHours));
  const a = polar(c, r, angleOf(fromHours));
  const b = polar(c, r, angleOf(fromHours + span - (span >= 24 ? 0.001 : 0)));
  const large = span > 12 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

/** The end of a range as hours, where an end at the next midnight is 24, not 0. */
const endHours = (start: Date, end: Date) => (end.getDate() !== start.getDate() ? 24 : hoursOf(end));

export const formatClock = (hours: number) => {
  const h = Math.floor(hours) % 24;
  const m = Math.floor((hours % 1) * 60);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

/** How long a finger rests on the ring before it scrubs instead of scrolling. */
const HOLD_MS = 220;

const SUNRISE = 6;
const SUNSET = 19;

/**
 * The day as one instrument (after the 2026 ADA winners Tide Guide and Moonlitt: one elegant
 * chart of time, not a stack of cards). Everything logged lands at the hour it happened:
 * sleep and focus as arcs on the outer track, meals / water / habit ticks / slips / mood as
 * marks, the route as a dashed span, and steps as a ring of hourly bars. Press and hold the ring,
 * then drag, to scrub through the day: the centre reads out what happened at that hour.
 */
export function DayDial({ events, steps, size, now, onScrub, onHoldChange, children }: Props) {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const reduceMotion = useReducedMotion();
  const hues = Hues[scheme];
  const [scrub, setScrub] = useState<number | null>(null);
  const lastHour = useRef<number | null>(null);
  const release = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrubbing = useRef(false);
  const touch = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const c = size / 2;
  const R = c - 16; // main track
  const markR = R - 24;
  const routeR = R - 38;
  const stepsBase = R - 46;
  const stepsMax = Math.max(12, size * 0.075);
  // Day is the lighter band in both schemes, so the sun's hours read at a glance.
  const dayTrack = scheme === 'dark' ? '#343B4B' : '#FFFFFF';
  const nightTrack = scheme === 'dark' ? '#1B1F28' : '#BCC3D1';

  const color = {
    focus: hues[Tracker.focus],
    route: hues[Tracker.route],
    meal: hues[Tracker.food],
    habit: hues[Tracker.habit],
    slip: hues[Tracker.quit],
    mood: hues[Tracker.mood],
    water: hues[Tracker.water],
    sleep: hues[Tracker.sleep],
    workout: hues[Tracker.steps],
  };
  const stepMax = Math.max(1, ...(steps ?? []));

  // Scrubbing. A swipe across the dial must scroll the page, so scrubbing starts only after the
  // finger rests on the ring for a moment (a haptic tick says it has started); a quick tap peeks
  // at that hour. While scrubbing, onHoldChange lets the screen lock its scrolling.
  const hourAtPoint = (x: number, y: number) => {
    const deg = (Math.atan2(y - c, x - c) * 180) / Math.PI + 90;
    return (((deg + 360) % 360) / 360) * 24;
  };
  const onRing = (e: GestureResponderEvent) => {
    const { locationX: x, locationY: y } = e.nativeEvent;
    const d = Math.hypot(x - c, y - c);
    return d > stepsBase - stepsMax - 6 && d < c;
  };
  const show = (h: number) => {
    setScrub(h);
    onScrub?.(h);
    if (Platform.OS !== 'web' && lastHour.current !== Math.floor(h)) Haptics.selectionAsync().catch(() => {});
    lastHour.current = Math.floor(h);
  };
  const fadeOut = () => {
    if (release.current) clearTimeout(release.current);
    // Hold the reading a moment after letting go, so there's time to read it.
    release.current = setTimeout(() => {
      setScrub(null);
      onScrub?.(null);
      lastHour.current = null;
    }, 1400);
  };
  const cancelHold = () => {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
  };
  const stopScrubbing = () => {
    cancelHold();
    if (scrubbing.current) {
      scrubbing.current = false;
      onHoldChange?.(false);
    }
  };

  const grant = (e: GestureResponderEvent) => {
    const { locationX: x, locationY: y } = e.nativeEvent;
    touch.current = { x, y, moved: false };
    if (release.current) clearTimeout(release.current);
    cancelHold();
    hold.current = setTimeout(() => {
      hold.current = null;
      scrubbing.current = true;
      onHoldChange?.(true);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      show(hourAtPoint(x, y));
    }, HOLD_MS);
  };
  const moveTouch = (e: GestureResponderEvent) => {
    const { locationX: x, locationY: y } = e.nativeEvent;
    if (scrubbing.current) return show(hourAtPoint(x, y));
    // Moving before the hold kicks in means a scroll: step aside.
    const t = touch.current;
    if (t && Math.hypot(x - t.x, y - t.y) > 8) {
      t.moved = true;
      cancelHold();
    }
  };
  const releaseTouch = () => {
    const t = touch.current;
    const tapped = !scrubbing.current && t && !t.moved && hold.current;
    stopScrubbing();
    if (tapped) show(hourAtPoint(t.x, t.y));
    if (tapped || scrub !== null) fadeOut();
  };
  const terminate = () => {
    const wasScrubbing = scrubbing.current;
    stopScrubbing();
    if (wasScrubbing) fadeOut();
  };

  const nearby = scrub === null ? [] : describeHour(events, steps, scrub);

  return (
    <MotiView
      from={reduceMotion ? undefined : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={Motion.settle}
      style={[{ width: size, height: size }, noSelect]}
      accessibilityRole="image"
      accessibilityLabel={describe(events, steps)}>
      <Svg width={size} height={size}>
        {/* Hour ticks, longer every six hours. */}
        {Array.from({ length: 24 }, (_, h) => {
          const major = h % 6 === 0;
          const a = polar(c, R + 9, angleOf(h));
          const b = polar(c, R + (major ? 15 : 12), angleOf(h));
          return <Line key={h} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={major ? theme.textSecondary : theme.border} strokeWidth={major ? 2 : 1.5} strokeLinecap="round" />;
        })}

        {/* Day / night track. */}
        <Path d={arc(c, R, SUNRISE, SUNSET)} stroke={dayTrack} strokeWidth={14} fill="none" strokeLinecap="butt" />
        <Path d={arc(c, R, SUNSET, 24)} stroke={nightTrack} strokeWidth={14} fill="none" />
        <Path d={arc(c, R, 0, SUNRISE)} stroke={nightTrack} strokeWidth={14} fill="none" />
        <Circle cx={c} cy={c} r={markR} stroke={theme.border} strokeWidth={1} fill="none" />

        {/* Steps: one bar per hour, growing inward, height by that hour's share of the busiest. */}
        {steps?.map((n, h) => {
          if (!n) return null;
          const deg = angleOf(h + 0.5);
          const a = polar(c, stepsBase, deg);
          const b = polar(c, stepsBase - Math.max(2, (n / stepMax) * stepsMax), deg);
          return <Line key={`s${h}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hues[Tracker.steps]} strokeWidth={size / 70} strokeLinecap="round" opacity={0.9} />;
        })}

        {/* Route: first point → last point. */}
        {events.map((e, i) =>
          e.kind === 'route' ? (
            <Path key={`r${i}`} d={arc(c, routeR, hoursOf(e.start), endHours(e.start, e.end))} stroke={color.route} strokeWidth={4} strokeDasharray="2 7" strokeLinecap="round" fill="none" />
          ) : null,
        )}

        {/* Sleep, focus and workouts sit in the track itself. */}
        {events.map((e, i) =>
          e.kind === 'sleep' || e.kind === 'focus' || e.kind === 'workout' ? (
            <Path
              key={`a${i}`}
              d={arc(c, R, hoursOf(e.start), Math.max(endHours(e.start, e.end), hoursOf(e.start) + 0.15))}
              stroke={color[e.kind]}
              strokeWidth={e.kind === 'sleep' ? 10 : 14}
              strokeLinecap="round"
              opacity={e.kind === 'sleep' ? 0.85 : 1}
              fill="none"
            />
          ) : null,
        )}

        {/* Point marks. */}
        <G>
          {events.map((e, i) => {
            if (!('at' in e)) return null;
            const p = polar(c, markR, angleOf(hoursOf(e.at)));
            const r = e.kind === 'meal' ? 6.5 : e.kind === 'mood' ? 6 : e.kind === 'water' ? 4 : 5;
            return <Circle key={`m${i}`} cx={p.x} cy={p.y} r={r} fill={color[e.kind]} stroke={theme.background} strokeWidth={2.5} />;
          })}
        </G>
      </Svg>

      {/* Cardinal hours as sky glyphs sitting in the track: night, dawn, noon, dusk. No language needed. */}
      <Glyph size={size} deg={-90} r={R}><Icon name="night" size={11} color={theme.textTertiary} weight="fill" /></Glyph>
      <Glyph size={size} deg={0} r={R}><Icon name="dawn" size={11} color={theme.textTertiary} weight="fill" /></Glyph>
      <Glyph size={size} deg={90} r={R}><Icon name="sun" size={11} color={theme.textTertiary} weight="fill" /></Glyph>
      <Glyph size={size} deg={180} r={R}><Icon name="moon" size={11} color={theme.textTertiary} weight="fill" /></Glyph>

      {/* Stays mounted while scrubbing (just hidden), so it doesn't sweep in from midnight again. */}
      {now && <Hand size={size} hours={hoursOf(now)} color={theme.accent} ring={theme.background} animate={!reduceMotion} hidden={scrub !== null} />}
      {scrub !== null && <Hand size={size} hours={scrub} color={theme.text} ring={theme.background} animate={false} />}

      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.center]}>
        {scrub === null ? (
          children
        ) : (
          <View style={[styles.readout, { maxWidth: stepsBase * 1.5 }]} accessibilityLiveRegion="polite">
            <ThemedText type="title" style={styles.tabular}>
              {formatClock(scrub)}
            </ThemedText>
            {nearby.length ? (
              nearby.map((line) => (
                <ThemedText key={line} type="caption" themeColor="textSecondary" numberOfLines={1} style={styles.readoutLine}>
                  {line}
                </ThemedText>
              ))
            ) : (
              <ThemedText type="caption" themeColor="textTertiary">
                Nothing logged
              </ThemedText>
            )}
          </View>
        )}
      </View>

      {/* Touch layer on the ring. It never blocks the page's scroll until a hold turns into a scrub. */}
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={onRing}
        onResponderGrant={(e) => {
          grant(e);
          return false; // Android: don't block the scroll view; a swipe stays a scroll
        }}
        onResponderMove={moveTouch}
        onResponderRelease={releaseTouch}
        onResponderTerminate={terminate}
        onResponderTerminationRequest={() => !scrubbing.current}
      />
    </MotiView>
  );
}

function Hand({ size, hours, color, ring, animate, hidden }: { size: number; hours: number; color: string; ring: string; animate: boolean; hidden?: boolean }) {
  const c = size / 2;
  return (
    <MotiView
      pointerEvents="none"
      from={animate ? { rotate: '0deg' } : undefined}
      animate={{ rotate: `${angleOf(hours) + 90}deg` }}
      transition={animate ? { type: 'spring', damping: 16, stiffness: 70 } : { type: 'timing', duration: 0 }}
      style={[StyleSheet.absoluteFill, hidden && styles.hidden]}>
      <View style={[styles.hand, { left: c - 1.5, top: 12, height: 44, backgroundColor: color }]} />
      <View style={[styles.handDot, { left: c - 7, top: 6, borderColor: ring, backgroundColor: color }]} />
    </MotiView>
  );
}

function Glyph({ size, deg, r, children }: { size: number; deg: number; r: number; children: ReactNode }) {
  const p = polar(size / 2, r, deg);
  return (
    <View pointerEvents="none" style={[styles.glyph, { left: p.x - 10, top: p.y - 10 }]}>
      {children}
    </View>
  );
}

const NOUN: Record<DialEvent['kind'], string> = {
  meal: 'Ate',
  habit: 'Done',
  slip: 'Slip',
  mood: 'Mood',
  water: 'Water',
  focus: 'Focus',
  route: 'Moving',
  sleep: 'Asleep',
  workout: 'Workout',
};

/** What the centre reads out while scrubbing: things within 40 minutes, ranges that cover the hour, steps that hour. */
function describeHour(events: DialEvent[], steps: number[] | undefined, hours: number): string[] {
  const lines: string[] = [];
  for (const e of events) {
    const hit = 'at' in e ? Math.abs(hoursOf(e.at) - hours) <= 0.67 : hours >= hoursOf(e.start) && hours <= endHours(e.start, e.end);
    if (hit && e.kind !== 'route') lines.push(e.label ? `${NOUN[e.kind]}: ${e.label}` : NOUN[e.kind]);
  }
  const n = steps?.[Math.floor(hours) % 24] ?? 0;
  if (n > 0) lines.push(`${n.toLocaleString()} steps`);
  return [...new Set(lines)].slice(0, 3);
}

/** Screen-reader summary of what the dial shows. */
function describe(events: DialEvent[], steps?: number[]) {
  const count = (k: DialEvent['kind']) => events.filter((e) => e.kind === k).length;
  const totalSteps = (steps ?? []).reduce((a, b) => a + b, 0);
  const parts = [
    count('sleep') && 'sleep',
    count('meal') && `${count('meal')} meals`,
    count('water') && `${count('water')} glasses of water`,
    count('focus') && `${count('focus')} focus sessions`,
    count('workout') && `${count('workout')} workouts`,
    count('habit') && `${count('habit')} habits ticked`,
    count('slip') && `${count('slip')} slips`,
    count('mood') && 'a mood check-in',
    count('route') && 'a route',
    totalSteps > 0 && `${totalSteps.toLocaleString()} steps`,
  ].filter(Boolean);
  return parts.length ? `Your day: ${parts.join(', ')}. Press and hold the ring, then drag, to explore it hour by hour.` : 'Nothing logged yet today.';
}

/** Small legend of the kinds present, in dial order. */
export function DialLegend({ events, steps }: { events: DialEvent[]; steps?: number[] }) {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const hues = Hues[scheme];
  const kinds: { kind: DialEvent['kind'] | 'steps'; label: string; color: string }[] = [
    { kind: 'sleep', label: 'Sleep', color: hues[Tracker.sleep] },
    { kind: 'meal', label: 'Meals', color: hues[Tracker.food] },
    { kind: 'water', label: 'Water', color: hues[Tracker.water] },
    { kind: 'focus', label: 'Focus', color: hues[Tracker.focus] },
    { kind: 'workout', label: 'Workout', color: hues[Tracker.steps] },
    { kind: 'habit', label: 'Habits', color: hues[Tracker.habit] },
    { kind: 'slip', label: 'Slips', color: hues[Tracker.quit] },
    { kind: 'mood', label: 'Mood', color: hues[Tracker.mood] },
    { kind: 'steps', label: 'Steps', color: hues[Tracker.steps] },
    { kind: 'route', label: 'Route', color: hues[Tracker.route] },
  ];
  const present = kinds.filter((k) => (k.kind === 'steps' ? (steps ?? []).some(Boolean) : events.some((e) => e.kind === k.kind)));
  if (!present.length) return null;
  return (
    <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {present.map((k) => (
        <View key={k.kind} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: k.color }]} />
          <ThemedText type="caption" color={theme.textSecondary}>
            {k.label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

// Web: dragging with a mouse would otherwise select the centre text; the cursor hints it can be dragged.
const noSelect = Platform.OS === 'web' ? ({ userSelect: 'none', cursor: 'grab' } as unknown as ViewStyle) : null;

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  readout: { alignItems: 'center', gap: 1 },
  readoutLine: { textAlign: 'center' },
  hand: { position: 'absolute', width: 3, borderRadius: 2 },
  hidden: { opacity: 0 },
  handDot: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  glyph: { position: 'absolute', width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 14, rowGap: 6, paddingHorizontal: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
});
