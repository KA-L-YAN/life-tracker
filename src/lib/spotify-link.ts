export type PlaylistRef = { type: 'playlist' | 'album'; id: string };

/** Reads a Spotify playlist or album out of a share link or URI; null for anything else. */
export function playlistRef(input: string): PlaylistRef | null {
  const text = input.trim();
  const uri = /^spotify:(playlist|album):([A-Za-z0-9]{10,40})$/.exec(text);
  if (uri) return { type: uri[1] as PlaylistRef['type'], id: uri[2] };
  const url = /^https?:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album)\/([A-Za-z0-9]{10,40})/.exec(text);
  return url ? { type: url[1] as PlaylistRef['type'], id: url[2] } : null;
}

export const toUri = (ref: PlaylistRef) => `spotify:${ref.type}:${ref.id}`;
export const toWebUrl = (ref: PlaylistRef) => `https://open.spotify.com/${ref.type}/${ref.id}`;
export const toEmbedUrl = (ref: PlaylistRef) => `https://open.spotify.com/embed/${ref.type}/${ref.id}`;

/** Spotify's own study playlists, each checked to exist. */
export const FOCUS_PLAYLISTS: { name: string; ref: PlaylistRef }[] = [
  { name: 'Deep Focus', ref: { type: 'playlist', id: '37i9dQZF1DWZeKCadgRdKQ' } },
  { name: 'lofi beats', ref: { type: 'playlist', id: '37i9dQZF1DWWQRwui0ExPn' } },
  { name: 'Peaceful Piano', ref: { type: 'playlist', id: '37i9dQZF1DX4sWSpwq3LiO' } },
  { name: 'Brain Food', ref: { type: 'playlist', id: '37i9dQZF1DWXLeA8Omikj7' } },
  { name: 'Jazz in the Background', ref: { type: 'playlist', id: '37i9dQZF1DWV7EzJMK2FUI' } },
];
