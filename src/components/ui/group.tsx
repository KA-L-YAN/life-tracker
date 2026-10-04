import { Children, Fragment, isValidElement, type PropsWithChildren, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Tap } from '@/components/ui/tap';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Apple's inset grouped list: one surface, rows divided by hairlines inset past the leading
 * icon. Replaces stacks of separate bordered cards.
 */
export function Group({ children }: PropsWithChildren) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.group, { backgroundColor: theme.surface }]}>
      {rows.map((row, i) => (
        <Fragment key={row.key ?? i}>
          {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

type RowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  /** Show a chevron when the row navigates. */
  chevron?: boolean;
  accessibilityLabel?: string;
  titleColor?: string;
};

export function Row({ title, subtitle, leading, trailing, onPress, chevron, accessibilityLabel, titleColor }: RowProps) {
  const theme = useTheme();
  const body = (
    <View style={styles.row}>
      {leading}
      <View style={styles.rowText}>
        <ThemedText type="body" color={titleColor} numberOfLines={2}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {trailing}
      {chevron && <Icon name="chevronRight" size={16} color={theme.textTertiary} weight="bold" />}
    </View>
  );
  if (!onPress) return body;
  return (
    <Tap onPress={onPress} scaleTo={0.99} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title}>
      {body}
    </Tap>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: Radius.large, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingVertical: 12, minHeight: 52 },
  rowText: { flex: 1, minWidth: 0, gap: 1 },
});
