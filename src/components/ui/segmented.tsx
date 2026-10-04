import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Tap } from '@/components/ui/tap';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Option<K extends string> = { key: K; label: string; icon?: IconName };

type Props<K extends string> = {
  options: readonly Option<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Read out as the group's name. */
  label: string;
};

/**
 * iOS-style segmented control: equal segments on a fog track, the chosen one lifted onto the
 * surface. Labels shrink to fit instead of wrapping, so four meals fit any phone and text size.
 */
export function Segmented<K extends string>({ options, value, onChange, label }: Props<K>) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.track, { backgroundColor: theme.fog }]}>
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Tap
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            scaleTo={0.97}
            containerStyle={styles.fill}
            style={[styles.segment, selected && { backgroundColor: theme.surface, boxShadow: '0 1px 3px rgba(12,14,20,0.12)' }]}>
            {o.icon && <Icon name={o.icon} size={16} color={selected ? theme.text : theme.textSecondary} weight={selected ? 'fill' : 'regular'} />}
            {/* Four or more segments drop to the caption size: web has no shrink-to-fit, and "Breakfast" must fit a phone. */}
            <ThemedText
              type={options.length >= 4 ? 'caption' : 'smallStrong'}
              themeColor={selected ? 'text' : 'textSecondary'}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}>
              {o.label}
            </ThemedText>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  track: { flexDirection: 'row', borderRadius: Radius.medium, padding: 3, gap: 3 },
  segment: {
    minHeight: 38,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
  },
});
