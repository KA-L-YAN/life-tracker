import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ToastProvider } from '@/components/ui/toast';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ProfileProvider, useProfile } from '@/lib/profile';

export default function AppLayout() {
  return (
    <ProfileProvider>
      <ToastProvider>
        <AppStack />
      </ToastProvider>
    </ProfileProvider>
  );
}

function AppStack() {
  const theme = useTheme();
  const { profile, isLoading, error, refresh } = useProfile();

  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <View style={styles.errorBox}>
          <ThemedText type="title">Couldn&apos;t load your plan</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {error}
          </ThemedText>
          <Button label="Try again" onPress={refresh} />
        </View>
      </ThemedView>
    );
  }

  const onboarded = !!profile?.onboarded_at;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="route" />
        <Stack.Screen name="habit/new" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="habit/[id]" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="insights" />
        <Stack.Screen name="body" />
        <Stack.Screen name="todos" />
        <Stack.Screen name="plan" options={{ animation: 'slide_from_bottom' }} />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  errorBox: { gap: Spacing.three, maxWidth: 420, width: '100%' },
});
