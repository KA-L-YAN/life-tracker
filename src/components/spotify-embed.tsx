import type { PlaylistRef } from '@/lib/spotify-link';

/** On phones the Spotify app does the playing (see FocusMusic); the embed is web only. */
export function SpotifyEmbed(_props: { playlist: PlaylistRef; dark: boolean }) {
  return null;
}
