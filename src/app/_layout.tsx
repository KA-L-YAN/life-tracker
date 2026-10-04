import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors, FontFiles } from '@/constants/theme';
import { AuthProvider, useSession } from '@/lib/auth';
import '@/lib/location/background-task';
import { setupPwa } from '@/lib/pwa';
import { ThemeModeProvider, useThemeMode } from '@/lib/theme-mode';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FontFiles);

  useEffect(() => {
    setupPwa();
  }, []);

  // Hold the native splash until fonts are in, so the first frame is already in Bricolage/Jakarta.
  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Web has no splash to hide behind, so draw immediately and let the fonts swap in.
  if (!fontsLoaded && !fontError && Platform.OS !== 'web') return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeModeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeModeProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { session, isLoading } = useSession();
  const { scheme } = useThemeMode();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, background: Colors[scheme].background } };

  if (isLoading) return null;

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors[scheme].background } }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
