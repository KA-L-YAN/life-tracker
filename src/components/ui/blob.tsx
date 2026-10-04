import { MotiView } from 'moti';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { Hues, type TileColor } from '@/constants/theme';

export type BlobShape = 'round' | 'cloud' | 'flower' | 'drop' | 'bean';
export type BlobMood = 'happy' | 'calm' | 'wow' | 'sleepy';

/** The buddy's body colours: the data hues, so a character always matches its tracker. */
export const BlobColors: Record<TileColor, string> = Hues.dark;

const FACE = '#16161A';

function Body({ shape, fill }: { shape: BlobShape; fill: string }) {
  switch (shape) {
    case 'cloud':
      return (
        <G fill={fill}>
          <Circle cx={34} cy={58} r={24} />
          <Circle cx={54} cy={42} r={27} />
          <Circle cx={71} cy={60} r={22} />
          <Rect x={16} y={56} width={72} height={30} rx={15} />
        </G>
      );
    case 'flower':
      return (
        <G fill={fill}>
          <Circle cx={50} cy={27} r={21} />
          <Circle cx={73} cy={50} r={21} />
          <Circle cx={50} cy={73} r={21} />
          <Circle cx={27} cy={50} r={21} />
          <Circle cx={50} cy={50} r={24} />
        </G>
      );
    case 'drop':
      return <Path fill={fill} d="M50 6C50 6 84 42 84 63C84 82 69 94 50 94C31 94 16 82 16 63C16 42 50 6 50 6Z" />;
    case 'bean':
      return <Rect fill={fill} x={12} y={20} width={76} height={66} rx={30} />;
    default:
      return <Path fill={fill} d="M50 9C74 7 93 25 91 51C89 76 73 93 49 91C25 89 8 74 10 49C12 25 27 11 50 9Z" />;
  }
}

function Face({ mood, cy }: { mood: BlobMood; cy: number }) {
  const eyeY = cy - 3;
  return (
    <G>
      {mood === 'sleepy' ? (
        <>
          <Path d={`M39 ${eyeY}q4 3 8 0`} stroke={FACE} strokeWidth={2.6} strokeLinecap="round" fill="none" />
          <Path d={`M53 ${eyeY}q4 3 8 0`} stroke={FACE} strokeWidth={2.6} strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <Circle cx={43} cy={eyeY} r={3.4} fill={FACE} />
          <Circle cx={57} cy={eyeY} r={3.4} fill={FACE} />
        </>
      )}
      {mood === 'wow' ? (
        <Circle cx={50} cy={cy + 8} r={3.2} fill={FACE} />
      ) : (
        <Path
          d={mood === 'calm' ? `M45 ${cy + 7}h10` : `M44 ${cy + 6}q6 6 12 0`}
          stroke={FACE}
          strokeWidth={2.6}
          strokeLinecap="round"
          fill="none"
        />
      )}
    </G>
  );
}

type Props = {
  shape?: BlobShape;
  color: string;
  size?: number;
  mood?: BlobMood;
  /** Gentle float loop — reserved for "something is running" moments. */
  bobbing?: boolean;
};

export function Blob({ shape = 'round', color, size = 56, mood = 'happy', bobbing = false }: Props) {
  const reduceMotion = useReducedMotion();
  const faceY = shape === 'cloud' ? 60 : shape === 'drop' ? 64 : 52;
  const svg = (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Body shape={shape} fill={color} />
      <Face mood={mood} cy={faceY} />
    </Svg>
  );

  if (!bobbing || reduceMotion) return svg;
  return (
    <MotiView
      from={{ translateY: 0 }}
      animate={{ translateY: -8 }}
      transition={{ type: 'timing', duration: 1400, loop: true }}>
      {svg}
    </MotiView>
  );
}
