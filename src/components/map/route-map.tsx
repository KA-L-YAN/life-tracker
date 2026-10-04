import { useMemo } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ATTRIBUTION, MAP_BASE_URL, type RouteMapProps, TILE_FILTER, TILE_URL } from '@/components/map/tiles';
import { Colors, Radius } from '@/constants/theme';
import { useThemeMode } from '@/lib/theme-mode';

/** Native: the same Leaflet map as web, inside a WebView — one map implementation to trust. */
export function RouteMap({ points, center, height = 280, interactive = true, lineColor }: RouteMapProps) {
  const { scheme } = useThemeMode();
  const line = lineColor ?? Colors[scheme].fab;

  const html = useMemo(() => {
    const data = {
      points: points.map((p) => [p.latitude, p.longitude]),
      center: center ? [center.latitude, center.longitude] : null,
      tiles: TILE_URL,
      attribution: ATTRIBUTION,
      line,
      surface: Colors[scheme].surface,
      interactive,
    };
    return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>html,body,#m{margin:0;height:100%;background:${Colors[scheme].fog}}.leaflet-tile-pane{filter:${TILE_FILTER[scheme]}}</style>
</head><body><div id="m"></div><script>
var d=${JSON.stringify(data)};
var i=d.interactive;
var map=L.map('m',{zoomControl:i,dragging:i,scrollWheelZoom:i,doubleClickZoom:i,touchZoom:i,boxZoom:i,keyboard:i}).setView([20,0],2);
map.attributionControl.setPrefix(false);
L.tileLayer(d.tiles,{attribution:d.attribution,maxZoom:19,keepBuffer:4}).addTo(map);
var p=d.points;
if(p.length===0){ if(d.center) map.setView(d.center,14); }
else {
  if(p.length>1){
    L.polyline(p,{color:d.line,weight:5,lineCap:'round',lineJoin:'round',opacity:0.95}).addTo(map);
    L.circleMarker(p[0],{radius:6,color:d.line,weight:3,fillColor:d.surface,fillOpacity:1}).addTo(map);
  }
  L.circleMarker(p[p.length-1],{radius:8,color:d.surface,weight:3,fillColor:d.line,fillOpacity:1}).addTo(map);
  if(p.length===1) map.setView(p[0],15); else map.fitBounds(p,{padding:[28,28],maxZoom:16});
}
</script></body></html>`;
  }, [points, center, scheme, line, interactive]);

  return (
    <View
      pointerEvents={interactive ? 'auto' : 'none'}
      style={{ height, borderRadius: Radius.large, overflow: 'hidden', backgroundColor: Colors[scheme].fog }}>
      <WebView
        source={{ html, baseUrl: MAP_BASE_URL }}
        originWhitelist={['*']}
        scrollEnabled={false}
        // Android: without this the screen's scroll view steals every drag, so the map can't be panned.
        nestedScrollEnabled={interactive}
        style={{ backgroundColor: 'transparent' }}
      />
    </View>
  );
}
