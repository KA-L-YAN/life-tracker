import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isInstalled, isIosBrowser } from '@/lib/pwa';

const DISMISSED = 'install-banner:dismissed';

type InstallPrompt = Event & { prompt: () => Promise<void> };

/**
 * On the website only: invites you to install Life Tracker as an app. iPhone and iPad Safari have
 * no install button, so it shows the two taps (Share, then Add to Home Screen); Chrome and Edge
 * get a real Install button. Hidden once installed or dismissed.
 */
export function InstallBanner() {
  const theme = useTheme();
  const [show, setShow] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const ios = isIosBrowser();

  useEffect(() => {
    if (Platform.OS !== 'web' || isInstalled()) return;
    let alive = true;
    AsyncStorage.getItem(DISMISSED)
      .then((v) => {
        if (alive && v !== '1' && ios) setShow(true);
      })
      .catch(() => {});
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
      AsyncStorage.getItem(DISMISSED)
        .then((v) => {
          if (alive && v !== '1') setShow(true);
        })
        .catch(() => {});
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => {
      alive = false;
      window.removeEventListener('beforeinstallprompt', onPrompt);
    };
  }, [ios]);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    AsyncStorage.setItem(DISMISSED, '1').catch(() => {});
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityRole="summary">
      <View style={styles.head}>
        <Icon name="download" size={20} color={theme.accent} weight="bold" />
        <ThemedText type="bodyStrong" style={styles.fill}>
          Install Life Tracker
        </ThemedText>
        <IconButton icon="close" label="Not now" variant="bare" size={16} color={theme.textTertiary} onPress={dismiss} />
      </View>
      {ios ? (
        <ThemedText type="small" themeColor="textSecondary">
          It works like an app, full screen from your home screen. In Safari, tap the Share button (the square with an arrow), then “Add to Home Screen”.
        </ThemedText>
      ) : (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Open it full screen from your home screen or dock, like any app.
          </ThemedText>
          <Button
            label="Install"
            icon="download"
            compact
            onPress={() => {
              prompt?.prompt().finally(() => setShow(false));
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  card: { borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
