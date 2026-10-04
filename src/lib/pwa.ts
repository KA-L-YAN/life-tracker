import { Platform } from 'react-native';

/**
 * Web-only: registers the service worker. The home-screen tags (manifest, apple-touch-icon,
 * status bar, viewport-fit) live in public/index.html, where iOS reliably reads them.
 */
export function setupPwa() {
  if (Platform.OS !== 'web') return;
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

/** True when running as an installed app (home screen), not in a browser tab. */
export function isInstalled() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return true;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iPhone or iPad Safari (iPadOS reports itself as a Mac with touch). */
export function isIosBrowser() {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}
