import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Blob } from '@/components/ui/blob';
import { Hues, Radius, Spacing, Tracker } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type BuddyContext, buddyNote } from '@/lib/buddy';
import { useThemeMode } from '@/lib/theme-mode';

/** The companion: one line a day, reacting to how the day is going. */
export function Buddy({ ctx, seed }: { ctx: BuddyContext; seed: number }) {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const note = buddyNote(ctx, seed);
  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface }]}>
      <Blob shape="round" color={Hues[scheme][Tracker.mood]} size={40} mood={note.mood} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        {note.text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingRight: Spacing.three, borderRadius: Radius.large },
  text: { flex: 1 },
});
