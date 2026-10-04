import { Platform, type ViewStyle } from 'react-native';

/**
 * "Almanac": a calm instrument for one day. Neutral surfaces and hairlines (Apple's
 * grouped-list grammar), a single accent for anything you can act on, and colour
 * reserved for data — each tracker owns a hue that marks the Day Dial, check circles,
 * bars and heatmaps. Night mode is a true night sky, so the data glows.
 */
export const Colors = {
  light: {
    background: '#F2F3F5',
    surface: '#FFFFFF',
    fog: '#E8EAEE',
    border: 'rgba(18,20,28,0.09)',
    text: '#12141A',
    textSecondary: '#5B606C',
    textTertiary: '#8A8F9A',
    inverse: '#FFFFFF',
    accent: '#3056E8',
    onAccent: '#FFFFFF',
    /** Kept as an alias of accent for older call sites. */
    fab: '#3056E8',
    danger: '#D93B4A',
    /** Floating chrome (tab bar, sheets) over content. */
    glass: 'rgba(250,251,252,0.8)',
    /** Dawn sky: the only decorative gradient, behind hero moments. */
    mesh: ['#DCE4FF', '#FFE4D8', '#DDF1FF', '#F4E0F6'],
  },
  dark: {
    background: '#0B0D12',
    surface: '#15181F',
    fog: '#20242D',
    border: 'rgba(255,255,255,0.08)',
    text: '#F2F3F6',
    textSecondary: '#A2A7B3',
    textTertiary: '#6E7380',
    inverse: '#0B0D12',
    accent: '#8BA2FF',
    onAccent: '#0B0D12',
    fab: '#8BA2FF',
    danger: '#FF6B78',
    glass: 'rgba(21,24,31,0.78)',
    /** Night sky. */
    mesh: ['#1D2556', '#2C1D48', '#0E2F40', '#23183A'],
  },
} as const;

export type ThemeColor = Exclude<keyof typeof Colors.light, 'mesh'>;
export type Scheme = keyof typeof Colors;

/** Data hues: the marks themselves (dial arcs, dots, check circles, bars). */
export const Hues = {
  light: {
    butter: '#E29A1F',
    lime: '#2F9E5E',
    bubblegum: '#E0476C',
    periwinkle: '#5A5EE0',
    mint: '#13968F',
    peach: '#EA7433',
    lilac: '#9660DE',
    sky: '#2893D2',
    plum: '#A5509E',
  },
  dark: {
    butter: '#F2B64A',
    lime: '#55C282',
    bubblegum: '#F2708F',
    periwinkle: '#8D90F6',
    mint: '#3CC3B8',
    peach: '#F59A63',
    lilac: '#B98CF2',
    sky: '#5CB8EC',
    plum: '#D98ACF',
  },
} as const;

export type TileColor = keyof typeof Hues.light;
export const TILE_COLORS = Object.keys(Hues.light) as TileColor[];

/** a→b by t, for #rrggbb colours. */
export function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}

const tints = (scheme: Scheme, amount: number) =>
  Object.fromEntries(TILE_COLORS.map((c) => [c, mix(Hues[scheme][c], Colors[scheme].surface, amount)])) as Record<TileColor, string>;

/** Soft backgrounds of each hue (badges, selected rows). Text on them uses the theme's text colour. */
export const Tints = { light: tints('light', 0.86), dark: tints('dark', 0.8) } as const;
/** @deprecated name kept for older call sites: tiles are now tints. */
export const Tiles = Tints;

/** Which hue each tracker owns. */
export const Tracker = {
  food: 'butter',
  habit: 'lime',
  quit: 'bubblegum',
  focus: 'periwinkle',
  route: 'mint',
  mood: 'lilac',
  steps: 'peach',
  water: 'sky',
  sleep: 'plum',
} as const satisfies Record<string, TileColor>;

type Sky = readonly [string, string, string, string];

/**
 * The sky behind the Day Dial follows the real hour: dawn blush, clear day, dusk amber, night
 * indigo. Light and dark mode each get their own versions, so text contrast holds either way.
 */
export const Skies: Record<Scheme, Record<'dawn' | 'day' | 'dusk' | 'night', Sky>> = {
  light: {
    dawn: ['#FFD9C9', '#FFEBDA', '#DCE4FF', '#F9D8EA'],
    day: ['#D3E4FF', '#E8F3FF', '#D6F0FF', '#E6E2FF'],
    dusk: ['#FFCDB8', '#FBD4E6', '#E4D9FF', '#FFE0C2'],
    night: ['#D5DAF3', '#E2DCF4', '#D5E2F1', '#E4DDF1'],
  },
  dark: {
    dawn: ['#3F2444', '#2B2150', '#16324C', '#43262F'],
    day: ['#15335E', '#1D2C58', '#0E3A4B', '#22305E'],
    dusk: ['#442238', '#30204E', '#172A43', '#4A2A34'],
    night: ['#1D2556', '#2C1D48', '#0E2F40', '#23183A'],
  },
};

export function skyAt(scheme: Scheme, hour: number): Sky {
  const phase = hour >= 5 && hour < 9 ? 'dawn' : hour >= 9 && hour < 17 ? 'day' : hour >= 17 && hour < 20.5 ? 'dusk' : 'night';
  return Skies[scheme][phase];
}

export const Fonts = {
  display: 'Bricolage_800',
  displayBold: 'Bricolage_700',
  regular: 'Jakarta_400',
  medium: 'Jakarta_500',
  semiBold: 'Jakarta_600',
  bold: 'Jakarta_700',
};

export const FontFiles = {
  Bricolage_800: require('@/assets/fonts/Bricolage-ExtraBold.ttf'),
  Bricolage_700: require('@/assets/fonts/Bricolage-Bold.ttf'),
  Jakarta_400: require('@/assets/fonts/Jakarta-Regular.ttf'),
  Jakarta_500: require('@/assets/fonts/Jakarta-Medium.ttf'),
  Jakarta_600: require('@/assets/fonts/Jakarta-SemiBold.ttf'),
  Jakarta_700: require('@/assets/fonts/Jakarta-Bold.ttf'),
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Tight on small inner things, soft on containers — not one radius for everything. */
export const Radius = {
  small: 10,
  medium: 14,
  large: 20,
  sheet: 28,
  pill: 999,
} as const;

export const Motion = {
  press: { type: 'spring', damping: 15, stiffness: 320 } as const,
  pop: { type: 'spring', damping: 11, stiffness: 240 } as const,
  settle: { type: 'spring', damping: 20, stiffness: 180 } as const,
};

/** Content column per layout (see useLayout). */
export const ContentWidth = { phone: 640, tablet: 780, desktop: 1120 } as const;
/** @deprecated use ContentWidth */
export const MaxContentWidth = ContentWidth.phone;
/** Height reserved under scroll content for the floating tab bar. */
export const TabBarSpace = 112;
/** Width of the desktop navigation rail. */
export const RailWidth = 96;
export const isWeb = Platform.OS === 'web';

/** Frosted glass behind floating chrome. Web only: native draws the translucent colour alone. */
export const glassBlur = isWeb ? ({ backdropFilter: 'saturate(180%) blur(20px)' } as unknown as ViewStyle) : null;
