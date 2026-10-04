import { SITE_URL } from '@/constants/links';
import type { LatLng } from '@/lib/geo';

/**
 * OpenStreetMap's own raster tiles: free, no API key (CARTO now watermarks keyless use).
 * Dark mode is the same tiles through a CSS filter, so there's one source to trust.
 */
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const TILE_FILTER = {
  light: 'saturate(0.65) contrast(0.95) brightness(1.03)',
  dark: 'invert(1) hue-rotate(180deg) brightness(0.88) contrast(0.92) saturate(0.45)',
} as const;

/** Sent as the WebView's origin so OSM's tile servers see a real referer (their usage policy requires one). */
export const MAP_BASE_URL = SITE_URL;

export type { LatLng };

export type RouteMapProps = {
  points: LatLng[];
  /** Where to look when there are no points yet (e.g. the most recent point ever). */
  center?: LatLng | null;
  height?: number;
  /** Mini-map mode: no gestures, taps pass through to the parent. */
  interactive?: boolean;
  /** Defaults to the app's indigo accent, which stays visible on both map themes. */
  lineColor?: string;
};

export { routeDistanceKm } from '@/lib/geo';
