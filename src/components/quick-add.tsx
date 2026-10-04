import { router } from 'expo-router';
import { AnimatePresence, MotiView } from 'moti';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Icon, type IconName } from '@/components/ui/icon';
import { Tap } from '@/components/ui/tap';
import { useToast } from '@/components/ui/toast';
import { ContentWidth, Hues, Radius, Spacing, Tints, type TileColor } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { addWater, deleteWater } from '@/lib/api/body';
import { addLog, deleteLog, type Habit, listHabits } from '@/lib/api/habits';
import { errorMessage } from '@/lib/errors';
import { captureCurrentLocation } from '@/lib/location/tracking';
import { useThemeMode } from '@/lib/theme-mode';

type Action = { key: string; label: string; tile: TileColor; icon: IconName; run: () => Promise<void> | void; instant?: boolean };

type Props = { open: boolean; onClose: () => void };

/** A short rise + fade: calm, and done in under a quarter second either way. */
const SHEET_RISE = 40;
const SHEET_IN = { type: 'timing', duration: 220, easing: Easing.out(Easing.cubic) } as const;
const SHEET_OUT = { type: 'timing', duration: 150, easing: Easing.in(Easing.cubic) } as const;

/**
 * A compact grid of tiles, Control Centre style. Tiles marked instant do their thing right
 * away (water, pin, slip) with Undo in the toast; the rest open the right screen.
 */
export function QuickAdd({ open, onClose }: Props) {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const { railed } = useLayout();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [quitHabits, setQuitHabits] = useState<Habit[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [choosingSlip, setChoosingSlip] = useState(false);

  useEffect(() => {
    if (!open) return;
    listHabits()
      .then((habits) => setQuitHabits(habits.filter((h) => h.kind === 'quit')))
      .catch(() => setQuitHabits([]));
  }, [open]);

  const go = (path: '/food' | '/focus' | '/habit/new' | '/body') => () => router.navigate(path);

  async function slip(h: Habit) {
    const id = await addLog(h.id);
    toast(`Slip logged for ${h.name}. Tomorrow is a fresh start.`, { label: 'Undo', onPress: () => deleteLog(id) });
  }

  const actions: Action[] = [
    { key: 'meal', label: 'Meal', tile: 'butter', icon: 'food', run: go('/food') },
    {
      key: 'water',
      label: 'Glass of water',
      tile: 'sky',
      icon: 'water',
      instant: true,
      run: async () => {
        const id = await addWater();
        toast('Glass of water added', { label: 'Undo', onPress: () => deleteWater(id) });
      },
    },
    { key: 'todo', label: 'Task', tile: 'peach', icon: 'todo', run: () => router.push({ pathname: '/todos', params: { compose: '1' } }) },
    { key: 'focus', label: 'Focus', tile: 'periwinkle', icon: 'focus', run: go('/focus') },
    { key: 'sleep', label: 'Sleep', tile: 'plum', icon: 'night', run: go('/body') },
    {
      key: 'pin',
      label: 'Pin place',
      tile: 'mint',
      icon: 'pin',
      instant: true,
      run: async () => {
        await captureCurrentLocation();
        toast('Pinned to today’s route.');
      },
    },
    { key: 'habit', label: 'New habit', tile: 'lime', icon: 'habit', run: go('/habit/new') },
    ...(quitHabits.length
      ? [
          {
            key: 'slip',
            label: 'Log a slip',
            tile: 'bubblegum' as const,
            icon: 'flame' as const,
            instant: quitHabits.length === 1,
            run: () => (quitHabits.length === 1 ? slip(quitHabits[0]) : setChoosingSlip((v) => !v)),
          },
        ]
      : []),
  ];

  async function run(action: Action) {
    setBusy(action.key);
    try {
      await action.run();
      if (action.key !== 'slip' || quitHabits.length === 1) onClose();
    } catch (err) {
      toast(errorMessage(err, 'That didn’t work. Try again.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <View style={StyleSheet.absoluteFill} key="quick-add">
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 180 }}
            exitTransition={{ type: 'timing', duration: 160 }}
            style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} accessibilityLabel="Close" />
          </MotiView>
          {/* Timing curves, not springs: a spring over a long travel overshot on the way in and
              took seconds to settle (and unmount) on the way out. */}
          <MotiView
            from={{ translateY: SHEET_RISE, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            exit={{ translateY: SHEET_RISE, opacity: 0 }}
            transition={SHEET_IN}
            exitTransition={SHEET_OUT}
            pointerEvents="box-none"
            style={[styles.sheetAnchor, railed && styles.floating]}>
            <View
              accessibilityViewIsModal
              style={[styles.sheet, railed ? styles.card : { paddingBottom: insets.bottom + 104 }, { backgroundColor: theme.background }]}>
              {!railed && <View style={[styles.handle, { backgroundColor: theme.border }]} />}
              <ThemedText type="title" accessibilityRole="header">
                Log something
              </ThemedText>
              <View style={styles.grid}>
                {actions.map((a) => {
                  const hue = Hues[scheme][a.tile];
                  return (
                    <Tap
                      key={a.key}
                      onPress={() => run(a)}
                      disabled={busy !== null}
                      scaleTo={0.94}
                      accessibilityRole="button"
                      accessibilityLabel={a.instant ? `${a.label}, logs straight away` : a.label}
                      containerStyle={styles.slot}
                      style={[styles.tile, { backgroundColor: Tints[scheme][a.tile] }]}>
                      <View style={styles.tileTop}>
                        <Icon name={a.icon} size={26} color={hue} weight="duotone" />
                        {a.instant && <Icon name="auto" size={13} color={hue} weight="fill" />}
                      </View>
                      <ThemedText type="caption" themeColor="text" numberOfLines={2}>
                        {a.label}
                      </ThemedText>
                    </Tap>
                  );
                })}
              </View>
              {choosingSlip && (
                <View style={styles.chips}>
                  {quitHabits.map((h) => (
                    <Chip
                      key={h.id}
                      label={h.name}
                      selected={false}
                      onPress={() =>
                        slip(h)
                          .then(onClose)
                          .catch((err) => toast(errorMessage(err, 'That didn’t work. Try again.')))
                      }
                    />
                  ))}
                </View>
              )}
              <View style={styles.legend}>
                <Icon name="auto" size={12} color={theme.textTertiary} weight="fill" />
                <ThemedText type="caption" themeColor="textTertiary">
                  logs straight away, with Undo
                </ThemedText>
              </View>
            </View>
          </MotiView>
        </View>
      )}
    </AnimatePresence>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(8,10,14,0.45)' },
  sheetAnchor: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  // Desktop: a centred card instead of a bottom sheet (there's no bottom bar to rise from).
  floating: { top: 0, justifyContent: 'center', padding: Spacing.four },
  sheet: {
    maxWidth: ContentWidth.phone - 160,
    width: '100%',
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: 20,
    paddingTop: Spacing.three,
    gap: 14,
  },
  card: { borderRadius: Radius.sheet, paddingBottom: 20, paddingTop: 20 },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { flexBasis: '30%', flexGrow: 1 },
  tile: { borderRadius: Radius.large, padding: 12, minHeight: 84, justifyContent: 'space-between', gap: 8 },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
});
