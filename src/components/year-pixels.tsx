import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Hues, mix, Tints, Tracker } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { localDateString } from '@/lib/day';
import { useThemeMode } from '@/lib/theme-mode';

export type PixelMetric = 'mood' | 'habits' | 'steps';

type Props = {
  year: number;
  metric: PixelMetric;
  /** Per YYYY-MM-DD: mood 1..5, habit share 0..1, or step count. */
  values: Map<string, number>;
  /** Steps only: the day's goal, which fills a pixel completely. */
  stepGoal?: number;
};

const GAP = 2;
const LABEL = 18;
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/** A year on one screen: a row per month, a square per day, coloured by the chosen measure. */
export function YearPixels({ year, metric, values, stepGoal = 8000 }: Props) {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const hues = Hues[scheme];
  const tints = Tints[scheme];
  const [width, setWidth] = useState(0);
  const cell = width ? (width - LABEL - GAP * 30) / 31 : 0;
  const today = localDateString(new Date());
  const moodColors = [hues.bubblegum, hues.peach, hues.butter, hues.lime, hues.mint];

  const colorOf = (v: number | undefined) => {
    if (v === undefined || v <= 0) return theme.fog;
    if (metric === 'mood') return moodColors[Math.round(v) - 1] ?? theme.fog;
    if (metric === 'habits') return mix(tints[Tracker.habit], hues[Tracker.habit], 0.25 + 0.75 * v);
    return mix(tints[Tracker.steps], hues[Tracker.steps], 0.25 + 0.75 * Math.min(1, v / stepGoal));
  };
  const logged = [...values.values()].filter((v) => v > 0).length;

  return (
    <View style={styles.wrap}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityRole="image"
        accessibilityLabel={`${year}, ${metric}: ${logged} days with data`}>
        {cell > 0 && (
          <Svg width={width} height={12 * (cell + GAP)}>
            {MONTHS.map((m, month) => (
              <SvgText key={`l${month}`} x={0} y={month * (cell + GAP) + cell * 0.8} fontSize={Math.min(11, cell)} fontFamily={Fonts.semiBold} fill={theme.textTertiary}>
                {m}
              </SvgText>
            ))}
            {MONTHS.map((_, month) =>
              Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, d) => {
                const key = localDateString(new Date(year, month, d + 1));
                return (
                  <Rect
                    key={key}
                    x={LABEL + d * (cell + GAP)}
                    y={month * (cell + GAP)}
                    width={cell}
                    height={cell}
                    rx={Math.min(3, cell / 3)}
                    fill={colorOf(values.get(key))}
                    opacity={key > today ? 0.35 : 1}
                    stroke={key === today ? theme.text : undefined}
                    strokeWidth={key === today ? 1.5 : 0}
                  />
                );
              }),
            )}
          </Svg>
        )}
      </View>
      <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {metric === 'mood' ? (
          ['Rough', 'Low', 'Okay', 'Good', 'Great'].map((label, i) => <Swatch key={label} color={moodColors[i]} label={label} />)
        ) : (
          <>
            <Swatch color={theme.fog} label="None" />
            <Swatch color={colorOf(metric === 'habits' ? 0.34 : stepGoal * 0.34)} label="Some" />
            <Swatch color={colorOf(metric === 'habits' ? 1 : stepGoal)} label={metric === 'habits' ? 'All done' : 'Goal'} />
          </>
        )}
      </View>
    </View>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.swatch}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  swatch: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 3 },
});
