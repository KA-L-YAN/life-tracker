import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  values: number[];
  /** One short label per bar; omit for unlabeled bars (e.g. 24 hours). */
  labels?: string[];
  color: string;
  /** Draws a dashed line at this value. */
  goal?: number;
  /** Index drawn at full strength; the rest are softened. */
  highlight?: number;
  height?: number;
  /** Read out as the chart's description. */
  label: string;
};

/** Plain bar chart: one bar per value, scaled to the larger of the goal and the busiest bar. */
export function Bars({ values, labels, color, goal, highlight, height = 88, label }: Props) {
  const theme = useTheme();
  const top = Math.max(goal ?? 0, ...values, 1);
  const gap = values.length > 12 ? 2 : 8;
  return (
    <View accessibilityRole="image" accessibilityLabel={label}>
      <View style={[styles.bars, { height, gap }]}>
        {goal ? <View style={[styles.goal, { bottom: `${(goal / top) * 100}%`, borderColor: theme.textTertiary }]} /> : null}
        {values.map((v, i) => (
          <View key={i} style={styles.track}>
            <View
              style={[
                styles.bar,
                {
                  height: `${Math.max(3, (v / top) * 100)}%`,
                  backgroundColor: v > 0 ? color : theme.fog,
                  opacity: highlight === undefined || highlight === i || v === 0 ? 1 : 0.55,
                  borderRadius: values.length > 12 ? 2 : 5,
                },
              ]}
            />
          </View>
        ))}
      </View>
      {labels && values.length > 12 ? (
        // Dense charts (24 hours) label only a few bars: each label sits at its bar's left edge
        // on one line, instead of being squeezed into a column a few pixels wide.
        <View style={styles.sparse}>
          {labels.map((l, i) =>
            l ? (
              <ThemedText key={i} type="caption" themeColor="textTertiary" numberOfLines={1} style={[styles.sparseLabel, { left: `${(i / values.length) * 100}%` }]}>
                {l}
              </ThemedText>
            ) : null,
          )}
        </View>
      ) : (
        labels && (
          <View style={[styles.labels, { gap }]}>
            {labels.map((l, i) => (
              <ThemedText key={i} type="caption" themeColor={highlight === i ? 'text' : 'textTertiary'} style={styles.label}>
                {l}
              </ThemedText>
            ))}
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row' },
  goal: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed' },
  track: { flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%' },
  labels: { flexDirection: 'row', marginTop: 6 },
  label: { flex: 1, textAlign: 'center' },
  sparse: { height: 18, marginTop: 6 },
  sparseLabel: { position: 'absolute', top: 0, width: 56 },
});
