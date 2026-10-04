import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

import { ATTRIBUTION, type RouteMapProps, TILE_FILTER, TILE_URL } from '@/components/map/tiles';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { useThemeMode } from '@/lib/theme-mode';

/**
 * Leaflet, not MapLibre: MapLibre GL renders from a separate Web Worker bundle that Expo's
 * web bundler never serves, which left the old map as an empty canvas. Leaflet is plain
 * DOM + raster tiles, so there is nothing extra to load.
 */
export function RouteMap({ points, center, height = 280, interactive = true, lineColor }: RouteMapProps) {
  const { scheme } = useThemeMode();
  const line = lineColor ?? Colors[scheme].fab;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tilesRef = useRef<L.TileLayer | null>(null);
  const routeRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    }).setView([20, 0], 2);
    map.attributionControl.setPrefix(false);
    tilesRef.current = L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19, keepBuffer: 4 }).addTo(map);
    routeRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // The container can resize after first layout (fonts, scroll views); keep tiles filling it.
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [interactive]);

  useEffect(() => {
    const pane = tilesRef.current?.getContainer();
    if (pane) pane.style.filter = TILE_FILTER[scheme];
    // Leaflet's default credit is a white Arial box; dress it in the app's type and surface.
    const credit = mapRef.current?.attributionControl.getContainer();
    if (credit) {
      Object.assign(credit.style, {
        background: `${Colors[scheme].surface}cc`,
        color: Colors[scheme].textSecondary,
        fontFamily: Fonts.regular,
        borderTopLeftRadius: '8px',
      });
      credit.querySelectorAll('a').forEach((a) => (a.style.color = 'inherit'));
    }
    const zoom = mapRef.current?.zoomControl?.getContainer();
    if (zoom) {
      Object.assign(zoom.style, { border: 'none', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' });
      zoom.querySelectorAll('a').forEach((a) =>
        Object.assign(a.style, { background: Colors[scheme].surface, color: Colors[scheme].text, borderColor: Colors[scheme].border }),
      );
    }
  }, [scheme, interactive]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = routeRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const latlngs = points.map((p) => [p.latitude, p.longitude] as [number, number]);
    const surface = Colors[scheme].surface;

    if (latlngs.length === 0) {
      if (center) map.setView([center.latitude, center.longitude], 14);
      return;
    }
    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: line, weight: 5, lineCap: 'round', lineJoin: 'round', opacity: 0.95 }).addTo(layer);
      L.circleMarker(latlngs[0], { radius: 6, color: line, weight: 3, fillColor: surface, fillOpacity: 1 }).addTo(layer);
    }
    L.circleMarker(latlngs[latlngs.length - 1], { radius: 8, color: surface, weight: 3, fillColor: line, fillOpacity: 1 }).addTo(layer);

    if (latlngs.length === 1) map.setView(latlngs[0], 15);
    else map.fitBounds(L.latLngBounds(latlngs), { padding: [28, 28], maxZoom: 16 });
  }, [points, center, line, scheme, interactive]);

  return (
    <div
      ref={containerRef}
      style={{
        height,
        width: '100%',
        borderRadius: Radius.large,
        overflow: 'hidden',
        background: Colors[scheme].fog,
        pointerEvents: interactive ? 'auto' : 'none',
        zIndex: 0,
        position: 'relative',
      }}
    />
  );
}
