import { useState } from 'react';
import { Linking, Platform, StyleSheet, Switch, TextInput, View } from 'react-native';

import { SpotifyEmbed } from '@/components/spotify-embed';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Tap } from '@/components/ui/tap';
import { useToast } from '@/components/ui/toast';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import { useProfile } from '@/lib/profile';
import { FOCUS_PLAYLISTS, type PlaylistRef, playlistRef, toUri, toWebUrl } from '@/lib/spotify-link';
import { useThemeMode } from '@/lib/theme-mode';

const SPOTIFY_GREEN = '#1DB954';

/** Opens the Spotify app on the playlist, or the web player when the app isn't installed. */
export async function openSpotify(ref: PlaylistRef) {
  if (Platform.OS === 'web') {
    window.open(toWebUrl(ref), '_blank', 'noopener');
    return;
  }
  try {
    await Linking.openURL(toUri(ref));
  } catch {
    await Linking.openURL(toWebUrl(ref));
  }
}

/** The saved focus playlist, if any (for starting music with a session). */
export function useFocusPlaylist() {
  const { profile } = useProfile();
  const ref = profile?.focus_playlist ? playlistRef(profile.focus_playlist) : null;
  return { ref, autoplay: !!ref && !!profile?.focus_music_autoplay };
}

/**
 * Music for focus sessions, played by Spotify: one of Spotify's study playlists or any playlist
 * or album link you paste. Optionally opens with every session you start.
 */
export function FocusMusic() {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const toast = useToast();
  const { profile, save } = useProfile();
  const { ref, autoplay } = useFocusPlaylist();
  const [link, setLink] = useState('');
  const [editing, setEditing] = useState(!ref);
  const name = FOCUS_PLAYLISTS.find((p) => ref && p.ref.id === ref.id)?.name ?? (ref ? `Your ${ref.type}` : null);

  const choose = (next: PlaylistRef | null) =>
    save({ focus_playlist: next ? toUri(next) : null })
      .then(() => setEditing(false))
      .catch((err) => toast(errorMessage(err, 'Couldn’t save that.')));

  function applyLink() {
    const parsed = playlistRef(link);
    if (!parsed) {
      toast('That isn’t a Spotify playlist or album link. Copy it from Share → Copy link in Spotify.');
      return;
    }
    setLink('');
    choose(parsed);
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.head}>
        <Icon name="spotify" size={22} color={SPOTIFY_GREEN} weight="fill" />
        <View style={styles.fill}>
          <ThemedText type="bodyStrong">Focus music</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {name ?? 'Pick something to study to'}
          </ThemedText>
        </View>
        {ref && !editing && (
          <Tap onPress={() => setEditing(true)} scaleTo={0.94} accessibilityRole="button" style={styles.change}>
            <ThemedText type="smallStrong" color={theme.accent}>
              Change
            </ThemedText>
          </Tap>
        )}
      </View>

      {ref && !editing && (
        <>
          <Tap onPress={() => openSpotify(ref)} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={`Play ${name} on Spotify`} style={[styles.play, { backgroundColor: SPOTIFY_GREEN }]}>
            <Icon name="play" size={18} color="#000000" weight="fill" />
            <ThemedText type="bodyStrong" color="#000000">
              Play on Spotify
            </ThemedText>
          </Tap>
          <SpotifyEmbed playlist={ref} dark={scheme === 'dark'} />
          <View style={styles.toggle}>
            <ThemedText type="small" style={styles.fill}>
              Open it when I start a focus session
            </ThemedText>
            <Switch
              value={autoplay}
              onValueChange={(v) => {
                save({ focus_music_autoplay: v }).catch(() => {});
              }}
              accessibilityLabel="Open Spotify when a focus session starts"
              trackColor={{ false: theme.fog, true: SPOTIFY_GREEN }}
              thumbColor="#FFFFFF"
            />
          </View>
        </>
      )}

      {editing && (
        <>
          <View style={styles.chips}>
            {FOCUS_PLAYLISTS.map((p) => (
              <Chip key={p.ref.id} label={p.name} selected={ref?.id === p.ref.id} onPress={() => choose(p.ref)} />
            ))}
          </View>
          <View style={[styles.inputRow, { backgroundColor: theme.fog }]}>
            <TextInput
              value={link}
              onChangeText={setLink}
              onSubmitEditing={applyLink}
              placeholder="Or paste a Spotify playlist link"
              placeholderTextColor={theme.textTertiary}
              accessibilityLabel="Spotify playlist or album link"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              style={[styles.input, { color: theme.text }]}
            />
            <Tap onPress={applyLink} disabled={!link.trim()} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Use this link" style={[styles.use, { backgroundColor: theme.accent }]}>
              <Icon name="check" size={18} color={theme.onAccent} weight="bold" />
            </Tap>
          </View>
          {profile?.focus_playlist && (
            <Tap onPress={() => choose(null)} scaleTo={0.96} accessibilityRole="button">
              <ThemedText type="small" themeColor="textSecondary">
                No music
              </ThemedText>
            </Tap>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  card: { borderRadius: Radius.large, padding: Spacing.three, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  change: { paddingVertical: 6, paddingHorizontal: 4 },
  play: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: Radius.pill },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Radius.medium, paddingLeft: Spacing.three, padding: 5 },
  input: { flex: 1, minHeight: 44, fontSize: 16, fontFamily: Fonts.regular },
  use: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
