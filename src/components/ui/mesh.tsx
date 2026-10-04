import { useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { useThemeMode } from '@/lib/theme-mode';

// Four soft colour pools at the corners approximate a mesh gradient; SVG keeps it identical on native and web.
const POOLS = [
  { cx: '12%', cy: '10%', r: '70%' },
  { cx: '92%', cy: '18%', r: '65%' },
  { cx: '85%', cy: '95%', r: '70%' },
  { cx: '8%', cy: '90%', r: '60%' },
];

/**
 * The sky: dawn in light mode, night in dark. The app's only decorative gradient, used behind
 * hero moments (the Day Dial, sign-in, plan setup) — never on ordinary cards.
 */
export function Mesh({ colors }: { colors?: readonly string[] }) {
  // SVG gradient ids are document-global on web, so each mesh needs its own.
  const id = 'mesh' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const { scheme } = useThemeMode();
  const palette = colors ?? Colors[scheme].mesh;
  // Android sizes a percentage-sized Svg once and misses later growth of its card, leaving a bare strip,
  // so once measured it draws at explicit pixels. Percentages cover the first frame, so it never pops in.
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: palette[1] }]}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      <Svg width={size?.width ?? '100%'} height={size?.height ?? '100%'}>
        <Defs>
          {POOLS.map((_, i) => (
            <RadialGradient key={i} id={`${id}-${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={palette[i % palette.length]} stopOpacity={1} />
              <Stop offset="1" stopColor={palette[i % palette.length]} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {POOLS.map((p, i) => (
          <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={`url(#${id}-${i})`} />
        ))}
      </Svg>
    </View>
  );
}
