import { type PlaylistRef, toEmbedUrl } from '@/lib/spotify-link';

/** Web only: Spotify's own player. Signed in to Spotify in this browser, it plays full tracks. */
export function SpotifyEmbed({ playlist, dark }: { playlist: PlaylistRef; dark: boolean }) {
  return (
    <iframe
      title="Spotify player"
      src={`${toEmbedUrl(playlist)}?theme=${dark ? 0 : 1}`}
      width="100%"
      height={152}
      style={{ border: 0, borderRadius: 14 }}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
  );
}
