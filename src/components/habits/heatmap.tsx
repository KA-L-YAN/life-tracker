import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import { Fonts, mix } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, isFuture, localDateString, startOfWeek } from '@/lib/day';

type Props = {
  /** Count per local YYYY-MM-DD. */
  counts: Map<string, number>;
  hue: string;
  tint: string;
  weeks?: number;
  label: string;
};

const GAP = 3;
const HEAD = 16;

/**
 * Half a year at a glance, one square per day, Monday at the top: the contribution-graph shape,
 * in the habit's own hue. Deeper colour = more logs that day.
 */
export function Heatmap({ counts, hue, tint, weeks = 26, label }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const cell = width ? (width - GAP * (weeks - 1)) / weeks : 0;
  const start = addDays(startOfWeek(new Date()), -(weeks - 1) * 7);
  const max = Math.max(1, ...counts.values());
  const logged = [...counts.values()].filter(Boolean).length;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="image"
      accessibilityLabel={`${label}: ${logged} of the last ${weeks * 7} days logged`}>
      {cell > 0 && (
        <Svg width={width} height={HEAD + 7 * cell + 6 * GAP}>
          {Array.from({ length: weeks }, (_, w) => {
            const monday = addDays(start, w * 7);
            const newMonth = w === 0 ? monday.getDate() <= 7 : addDays(monday, -7).getMonth() !== monday.getMonth();
            const x = w * (cell + GAP);
            return (
              <SvgText key={`m${w}`} x={x} y={11} fontSize={11} fontFamily={Fonts.semiBold} fill={theme.textTertiary}>
                {newMonth && w < weeks - 1 ? monday.toLocaleDateString(undefined, { month: 'short' }) : ''}
              </SvgText>
            );
          })}
          {Array.from({ length: weeks * 7 }, (_, i) => {
            const d = addDays(start, i);
            if (isFuture(d)) return null;
            const n = counts.get(localDateString(d)) ?? 0;
            const fill = n === 0 ? theme.fog : mix(tint, hue, 0.45 + 0.55 * (n / max));
            return (
              <Rect
                key={i}
                x={Math.floor(i / 7) * (cell + GAP)}
                y={HEAD + (i % 7) * (cell + GAP)}
                width={cell}
                height={cell}
                rx={Math.min(4, cell / 3)}
                fill={fill}
              />
            );
          })}
        </Svg>
      )}
    </View>
  );
}
