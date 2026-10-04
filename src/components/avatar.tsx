import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Blob } from '@/components/ui/blob';
import { Hues, Tints } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Avatar as AvatarData, avatarUrl } from '@/lib/avatar';
import { useThemeMode } from '@/lib/theme-mode';

/** Your picture: the photo you chose, or your buddy in its chosen shape, colour and mood. */
export function Avatar({ avatar, size = 40 }: { avatar: AvatarData; size?: number }) {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const [uri, setUri] = useState<string | null>(null);
  const path = avatar.kind === 'photo' ? avatar.path : null;

  useEffect(() => {
    if (!path) return;
    let alive = true;
    avatarUrl(path).then((u) => {
      if (alive) setUri(u);
    });
    return () => {
      alive = false;
    };
  }, [path]);

  const ring = { width: size, height: size, borderRadius: size * 0.36 };
  if (avatar.kind === 'photo') {
    return (
      <View style={[styles.frame, ring, { backgroundColor: theme.fog }]}>
        {uri && <Image source={{ uri }} style={ring} accessibilityIgnoresInvertColors />}
      </View>
    );
  }
  return (
    <View style={[styles.frame, ring, { backgroundColor: Tints[scheme][avatar.color] }]}>
      <Blob shape={avatar.shape} color={Hues.dark[avatar.color]} mood={avatar.mood} size={size * 0.8} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
