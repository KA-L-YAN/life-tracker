import type { TabTriggerSlotProps } from 'expo-router/ui';
import { MotiView } from 'moti';
import { createContext, forwardRef, type PropsWithChildren, useContext } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Tap } from '@/components/ui/tap';
import { glassBlur, Radius, RailWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Whether the bar is the desktop rail (vertical, labelled) or the phone bar (horizontal, icons). */
const RailContext = createContext(false);

/** Liquid-glass-style chrome: translucent, blurred where the platform can (web), hairline edge. */
export function TabBarShell({ children, rail = false }: PropsWithChildren<{ rail?: boolean }>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  if (rail) {
    return (
      <RailContext.Provider value>
        <View
          accessibilityRole="tablist"
          style={[styles.rail, glassBlur, { backgroundColor: theme.glass, borderRightColor: theme.border, paddingTop: insets.top + Spacing.four }]}>
          {children}
        </View>
      </RailContext.Provider>
    );
  }
  return (
    <View pointerEvents="box-none" style={[styles.anchor, { bottom: insets.bottom + 12 }]}>
      <View accessibilityRole="tablist" style={[styles.bar, glassBlur, { backgroundColor: theme.glass, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon: IconName; label: string };

/**
 * Phone: icon only — the active tab fills its icon on a soft accent pill (no label to collide
 * with the + at large text sizes; the screen title names the tab). Rail: icon over label.
 */
export const TabButton = forwardRef<View, TabButtonProps>(function TabButton({ icon, label, isFocused, ...props }, ref) {
  const theme = useTheme();
  const rail = useContext(RailContext);
  const color = isFocused ? theme.accent : theme.textSecondary;
  return (
    <Pressable
      ref={ref}
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      style={rail ? styles.railSlot : styles.slot}>
      <MotiView
        animate={{ scale: isFocused ? 1 : 0.94, opacity: 1 }}
        transition={{ type: 'timing', duration: 180 }}
        style={[rail ? styles.railPill : styles.pill, isFocused && { backgroundColor: theme.fog }]}>
        <Icon name={icon} color={color} size={rail ? 22 : 24} weight={isFocused ? 'fill' : 'regular'} />
      </MotiView>
      {rail && (
        <ThemedText type="caption" color={color} numberOfLines={1}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
});

export function AddButton({ onPress, open }: { onPress: () => void; open: boolean }) {
  const theme = useTheme();
  const rail = useContext(RailContext);
  return (
    <Tap
      onPress={onPress}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={open ? 'Close add menu' : 'Add something'}
      accessibilityState={{ expanded: open }}
      containerStyle={rail ? styles.railAdd : undefined}
      style={[styles.fab, { backgroundColor: theme.accent }]}>
      <MotiView animate={{ rotate: open ? '45deg' : '0deg' }} transition={{ type: 'timing', duration: 200 }}>
        <Icon name="add" color={theme.onAccent} size={26} weight="bold" />
      </MotiView>
    </Tap>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: Spacing.three },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 440,
    height: 68,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: '0 10px 30px rgba(12,14,24,0.14)',
  },
  // Equal slots keep the + centred.
  slot: { flex: 1, alignItems: 'center' },
  pill: { width: 52, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  fab: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: RailWidth,
    alignItems: 'center',
    gap: Spacing.three,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  railSlot: { alignItems: 'center', gap: 4, width: RailWidth - 16, paddingVertical: 4 },
  railPill: { width: 56, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  railAdd: { marginBottom: Spacing.three },
});
