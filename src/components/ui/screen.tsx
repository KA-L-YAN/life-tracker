import { router } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconButton } from '@/components/ui/icon-button';
import { Spacing, TabBarSpace } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';

type Props = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  /** Actions on the right of the header. */
  right?: ReactNode;
  back?: boolean;
  /** Reserve space for the floating tab bar (phones and tablets). */
  tabbed?: boolean;
  scroll?: boolean;
  /** Turn scrolling off for a moment (e.g. while a gesture owns the finger). */
  scrollEnabled?: boolean;
  /** Something above the title, e.g. a date line. */
  eyebrow?: ReactNode;
}>;

/** Back, or home when the page was opened directly (a web refresh or shared link has no history). */
export const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

export function Screen({ title, subtitle, right, back, tabbed, scroll = true, scrollEnabled = true, eyebrow, children }: Props) {
  const insets = useSafeAreaInsets();
  const { contentWidth, railed, size } = useLayout();
  const header = (title || back || right) && (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {back && <IconButton icon="chevronLeft" label="Back" onPress={goBack} />}
        {title && (
          <View style={styles.titleWrap}>
            {eyebrow}
            <ThemedText type="display" accessibilityRole="header" numberOfLines={2}>
              {title}
            </ThemedText>
            {subtitle && (
              <ThemedText type="small" themeColor="textSecondary">
                {subtitle}
              </ThemedText>
            )}
          </View>
        )}
      </View>
      {right && <View style={styles.headerRight}>{right}</View>}
    </View>
  );

  const bottomBar = tabbed && !railed;
  const padding = {
    width: '100%' as const,
    maxWidth: contentWidth,
    paddingHorizontal: size === 'phone' ? 20 : Spacing.five,
    paddingTop: insets.top + (size === 'phone' ? Spacing.three : Spacing.five),
    paddingBottom: (bottomBar ? TabBarSpace : Spacing.five) + insets.bottom,
  };

  return (
    <ThemedView style={styles.fill}>
      {scroll ? (
        <ScrollView
          scrollEnabled={scrollEnabled}
          style={styles.fill}
          contentContainerStyle={[styles.column, padding]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, styles.column, padding]}>
          {header}
          {children}
        </View>
      )}
    </ThemedView>
  );
}

/** A titled block of the page. Titles are sentence case, no eyebrow labels. */
export function Section({ title, action, children, style }: PropsWithChildren<{ title?: string; action?: ReactNode; style?: object }>) {
  return (
    <View style={[styles.section, style]}>
      {(title || action) && (
        <View style={styles.sectionHeader}>
          {title && (
            <ThemedText type="title" accessibilityRole="header">
              {title}
            </ThemedText>
          )}
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { alignSelf: 'center', gap: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.three },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  titleWrap: { gap: 2, flexShrink: 1 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: Spacing.three },
});
