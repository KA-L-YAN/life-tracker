import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, View } from 'react-native';

import { RouteMap } from '@/components/map/route-map';
import { routeDistanceKm } from '@/components/map/tiles';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Group, Row } from '@/components/ui/group';
import { Screen } from '@/components/ui/screen';
import { WeekStrip } from '@/components/ui/week-strip';
import { glassBlur, Hues, Radius, Spacing, Tracker } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useRouteDay } from '@/hooks/use-route-day';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDayLabel, isSameDay, startOfDay } from '@/lib/day';
import { ROUTE_KEEP_DAYS } from '@/lib/location/config';
import {
  captureCurrentLocation,
  isBackgroundTrackingActive,
  requestLocationPermissions,
  startBackgroundTracking,
  stopBackgroundTracking,
} from '@/lib/location/tracking';
import { useThemeMode } from '@/lib/theme-mode';
import { errorMessage } from '@/lib/errors';

const isNative = Platform.OS !== 'web';

/**
 * Stores expect a plain-language disclosure before the system's background-location prompt:
 * what is collected, when (even when closed), why, and where it goes.
 */
function confirmBackgroundLocation() {
  return new Promise<boolean>((resolve) =>
    Alert.alert(
      'Track your route in the background?',
      'Life Tracker records your location every few minutes, even when the app is closed or not in use, to draw your daily route. ' +
        `Points are saved to your account, visible only to you, and deleted after ${ROUTE_KEEP_DAYS} days or when you delete your account. You can turn this off here any time.`,
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}

function parseDay(param?: string) {
  if (!param) return new Date();
  const [y, m, d] = param.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date();
}

export default function RouteScreen() {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const { twoUp } = useLayout();
  const hue = Hues[scheme][Tracker.route];
  const params = useLocalSearchParams<{ day?: string }>();
  const [day, setDay] = useState(() => parseDay(params.day));
  const [tracking, setTracking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { data, refetch } = useRouteDay(day);

  useEffect(() => {
    if (isNative) isBackgroundTrackingActive().then(setTracking).catch(() => {});
  }, []);

  async function pinNow() {
    setBusy(true);
    setMessage(null);
    try {
      await captureCurrentLocation();
      if (!isSameDay(day, new Date())) setDay(new Date());
      await refetch();
      setMessage('Pinned. It’s on today’s route.');
    } catch (err) {
      setMessage(errorMessage(err, 'Couldn’t get your location.'));
    } finally {
      setBusy(false);
    }
  }

  async function toggleTracking(next: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      if (!next) {
        await stopBackgroundTracking();
        setTracking(false);
        return;
      }
      if (!(await confirmBackgroundLocation())) return;
      const result = await requestLocationPermissions();
      if (result === 'denied') {
        setMessage('Location access is off. Turn it on for Life Tracker in your phone settings.');
        return;
      }
      await startBackgroundTracking();
      setTracking(true);
      if (result === 'foreground-only') setMessage('Choose “Allow all the time” in settings so tracking continues when the app is closed.');
    } catch (err) {
      setMessage(errorMessage(err, 'Couldn’t change tracking.'));
    } finally {
      setBusy(false);
    }
  }

  const points = data?.points ?? [];
  const expired = startOfDay(day) < addDays(startOfDay(new Date()), -ROUTE_KEEP_DAYS);
  const km = routeDistanceKm(points);
  const first = points[0];
  const last = points.at(-1);
  const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—');

  const statsStrip = (
    <View style={[styles.stats, glassBlur, { backgroundColor: theme.glass, borderColor: theme.border }]}>
      <Stat label="Distance" value={points.length > 1 ? `${km.toFixed(1)} km` : '0 km'} color={hue} />
      <Stat label="First point" value={time(first?.recorded_at)} />
      <Stat label="Last point" value={time(last?.recorded_at)} />
    </View>
  );

  return (
    <Screen title="Route" subtitle={formatDayLabel(day)} back>
      <WeekStrip day={day} onChange={setDay} />

      <View style={styles.mapWrap}>
        <RouteMap points={points} center={data?.center} height={twoUp ? 520 : 400} lineColor={hue} />
        {/* Glass stats float over the map, so the route keeps the whole card. */}
        <View pointerEvents="none" style={styles.top}>
          {statsStrip}
        </View>
        {points.length === 0 && (
          <View style={[styles.overlay, glassBlur, { backgroundColor: theme.glass, borderColor: theme.border }]}>
            {expired ? (
              <>
                <ThemedText type="smallStrong">Routes are kept for {ROUTE_KEEP_DAYS} days</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  Older routes are cleared automatically to save space. Meals, habits and focus time stay.
                </ThemedText>
              </>
            ) : (
              <>
                <ThemedText type="smallStrong">No points for {isSameDay(day, new Date()) ? 'today' : 'this day'} yet</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {isNative ? 'Turn on background tracking, or pin where you are.' : 'Each visit pins where you are. You can also pin now.'}
                </ThemedText>
              </>
            )}
          </View>
        )}
      </View>

      {isNative && (
        <Group>
          <Row
            title="Background tracking"
            subtitle="Adds a point every 5 minutes or 100 m while you move."
            trailing={
              <Switch
                value={tracking}
                onValueChange={toggleTracking}
                disabled={busy}
                accessibilityLabel="Background tracking"
                trackColor={{ false: theme.fog, true: hue }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </Group>
      )}

      <Button label="Pin where I am" icon="locate" variant={isNative ? 'secondary' : 'primary'} onPress={pinNow} loading={busy} />
      {message && (
        <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
          {message}
        </ThemedText>
      )}
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="bodyStrong" color={color} style={styles.tabular} numberOfLines={1}>
        {value}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
  mapWrap: { borderRadius: Radius.large, overflow: 'hidden' },
  top: { position: 'absolute', top: Spacing.two, left: Spacing.two, right: Spacing.two, zIndex: 2 },
  overlay: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
    bottom: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: 2,
    zIndex: 2,
  },
  stats: { flexDirection: 'row', borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 10, paddingHorizontal: Spacing.three, gap: Spacing.two },
  stat: { flex: 1, gap: 1 },
});
