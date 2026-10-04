import type { IconProps, IconWeight } from 'phosphor-react-native';
import { ArrowCounterClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowCounterClockwise';
import { ArrowRightIcon } from 'phosphor-react-native/src/icons/ArrowRight';
import { ArrowsClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowsClockwise';
import { BarbellIcon } from 'phosphor-react-native/src/icons/Barbell';
import { BedIcon } from 'phosphor-react-native/src/icons/Bed';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { BicycleIcon } from 'phosphor-react-native/src/icons/Bicycle';
import { BookOpenIcon } from 'phosphor-react-native/src/icons/BookOpen';
import { BrainIcon } from 'phosphor-react-native/src/icons/Brain';
import { BriefcaseIcon } from 'phosphor-react-native/src/icons/Briefcase';
import { CalendarBlankIcon } from 'phosphor-react-native/src/icons/CalendarBlank';
import { CameraIcon } from 'phosphor-react-native/src/icons/Camera';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { ChartBarIcon } from 'phosphor-react-native/src/icons/ChartBar';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { CodeIcon } from 'phosphor-react-native/src/icons/Code';
import { CoffeeIcon } from 'phosphor-react-native/src/icons/Coffee';
import { CrosshairIcon } from 'phosphor-react-native/src/icons/Crosshair';
import { DeviceMobileIcon } from 'phosphor-react-native/src/icons/DeviceMobile';
import { DownloadSimpleIcon } from 'phosphor-react-native/src/icons/DownloadSimple';
import { DropIcon } from 'phosphor-react-native/src/icons/Drop';
import { FlameIcon } from 'phosphor-react-native/src/icons/Flame';
import { FootprintsIcon } from 'phosphor-react-native/src/icons/Footprints';
import { ForkKnifeIcon } from 'phosphor-react-native/src/icons/ForkKnife';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { HeartbeatIcon } from 'phosphor-react-native/src/icons/Heartbeat';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { ImageIcon } from 'phosphor-react-native/src/icons/Image';
import { LeafIcon } from 'phosphor-react-native/src/icons/Leaf';
import { LightningIcon } from 'phosphor-react-native/src/icons/Lightning';
import { ListChecksIcon } from 'phosphor-react-native/src/icons/ListChecks';
import { MapPinIcon } from 'phosphor-react-native/src/icons/MapPin';
import { MinusIcon } from 'phosphor-react-native/src/icons/Minus';
import { MoonIcon } from 'phosphor-react-native/src/icons/Moon';
import { MoonStarsIcon } from 'phosphor-react-native/src/icons/MoonStars';
import { MusicNotesIcon } from 'phosphor-react-native/src/icons/MusicNotes';
import { MusicNotesSimpleIcon } from 'phosphor-react-native/src/icons/MusicNotesSimple';
import { NavigationArrowIcon } from 'phosphor-react-native/src/icons/NavigationArrow';
import { OrangeSliceIcon } from 'phosphor-react-native/src/icons/OrangeSlice';
import { PaletteIcon } from 'phosphor-react-native/src/icons/Palette';
import { PathIcon } from 'phosphor-react-native/src/icons/Path';
import { PencilLineIcon } from 'phosphor-react-native/src/icons/PencilLine';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { PlantIcon } from 'phosphor-react-native/src/icons/Plant';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { ProhibitIcon } from 'phosphor-react-native/src/icons/Prohibit';
import { SignOutIcon } from 'phosphor-react-native/src/icons/SignOut';
import { SmileyIcon } from 'phosphor-react-native/src/icons/Smiley';
import { SmileyMehIcon } from 'phosphor-react-native/src/icons/SmileyMeh';
import { SmileyNervousIcon } from 'phosphor-react-native/src/icons/SmileyNervous';
import { SmileySadIcon } from 'phosphor-react-native/src/icons/SmileySad';
import { SmileyWinkIcon } from 'phosphor-react-native/src/icons/SmileyWink';
import { SneakerIcon } from 'phosphor-react-native/src/icons/Sneaker';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { SpotifyLogoIcon } from 'phosphor-react-native/src/icons/SpotifyLogo';
import { StopIcon } from 'phosphor-react-native/src/icons/Stop';
import { SunIcon } from 'phosphor-react-native/src/icons/Sun';
import { SunHorizonIcon } from 'phosphor-react-native/src/icons/SunHorizon';
import { TargetIcon } from 'phosphor-react-native/src/icons/Target';
import { TimerIcon } from 'phosphor-react-native/src/icons/Timer';
import { TranslateIcon } from 'phosphor-react-native/src/icons/Translate';
import { TrashIcon } from 'phosphor-react-native/src/icons/Trash';
import { UserIcon } from 'phosphor-react-native/src/icons/User';
import { WalletIcon } from 'phosphor-react-native/src/icons/Wallet';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Phosphor, imported one file per icon so only these ship. Its weights (regular, bold, fill,
 * duotone) do the work Lucide's single stroke couldn't: fill marks the active tab, duotone
 * gives habit badges depth.
 */
const ICONS = {
  home: HouseIcon,
  food: ForkKnifeIcon,
  habit: PlantIcon,
  focus: TimerIcon,
  route: PathIcon,
  pin: MapPinIcon,
  locate: CrosshairIcon,
  navigation: NavigationArrowIcon,
  add: PlusIcon,
  minus: MinusIcon,
  sync: ArrowsClockwiseIcon,
  auto: LightningIcon,
  image: ImageIcon,
  camera: CameraIcon,
  spotify: SpotifyLogoIcon,
  todo: ListChecksIcon,
  playlist: MusicNotesSimpleIcon,
  workout: BarbellIcon,
  steps: SneakerIcon,
  health: HeartbeatIcon,
  check: CheckIcon,
  close: XIcon,
  chevronLeft: CaretLeftIcon,
  chevronRight: CaretRightIcon,
  arrowRight: ArrowRightIcon,
  trash: TrashIcon,
  undo: ArrowCounterClockwiseIcon,
  edit: PencilSimpleIcon,
  sun: SunIcon,
  moon: MoonIcon,
  night: MoonStarsIcon,
  dawn: SunHorizonIcon,
  signOut: SignOutIcon,
  bell: BellIcon,
  clock: ClockIcon,
  calendar: CalendarBlankIcon,
  target: TargetIcon,
  flame: FlameIcon,
  play: PlayIcon,
  stop: StopIcon,
  user: UserIcon,
  sparkles: SparkleIcon,
  insights: ChartBarIcon,
  download: DownloadSimpleIcon,
  mood1: SmileySadIcon,
  mood2: SmileyNervousIcon,
  mood3: SmileyMehIcon,
  mood4: SmileyIcon,
  mood5: SmileyWinkIcon,
  // habit picker
  book: BookOpenIcon,
  dumbbell: BarbellIcon,
  water: DropIcon,
  sleep: BedIcon,
  brain: BrainIcon,
  music: MusicNotesIcon,
  wallet: WalletIcon,
  work: BriefcaseIcon,
  code: CodeIcon,
  leaf: LeafIcon,
  apple: OrangeSliceIcon,
  heart: HeartIcon,
  write: PencilLineIcon,
  walk: FootprintsIcon,
  bike: BicycleIcon,
  coffee: CoffeeIcon,
  ban: ProhibitIcon,
  phone: DeviceMobileIcon,
  language: TranslateIcon,
  art: PaletteIcon,
} satisfies Record<string, ComponentType<IconProps>>;

export type IconName = keyof typeof ICONS;

export const HABIT_ICONS: IconName[] = [
  'book', 'dumbbell', 'water', 'sleep', 'brain', 'music', 'wallet', 'work',
  'code', 'leaf', 'apple', 'heart', 'write', 'walk', 'bike', 'coffee',
  'ban', 'phone', 'language', 'art', 'flame', 'sparkles',
];

export function isIconName(value: string): value is IconName {
  return value in ICONS;
}

type Props = {
  name: IconName;
  color?: string;
  size?: number;
  weight?: IconWeight;
  /** @deprecated Lucide-era stroke width; heavy strokes (≥2.5) map to Phosphor's bold weight. */
  strokeWidth?: number;
};

export function Icon({ name, color = '#12141A', size = 20, weight, strokeWidth }: Props) {
  const Component = ICONS[name];
  const resolved: IconWeight = weight ?? (strokeWidth !== undefined && strokeWidth >= 2.5 ? 'bold' : 'regular');
  return <Component color={color} size={size} weight={resolved} />;
}

/** A tracker's mark: its icon (duotone) on a soft tint of the same hue. */
export function IconBadge({ name, size = 44, hue, tint }: { name: IconName; size?: number; hue: string; tint: string }) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: tint }]}>
      <Icon name={name} color={hue} size={Math.round(size * 0.52)} weight="duotone" />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
});
