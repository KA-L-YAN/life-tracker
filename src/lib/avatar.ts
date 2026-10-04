import * as ImagePicker from 'expo-image-picker';

import type { BlobMood, BlobShape } from '@/components/ui/blob';
import type { TileColor } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export type Avatar =
  | { kind: 'photo'; path: string }
  | { kind: 'buddy'; shape: BlobShape; color: TileColor; mood: BlobMood };

export const DEFAULT_AVATAR: Avatar = { kind: 'buddy', shape: 'round', color: 'lilac', mood: 'happy' };

export function asAvatar(v: unknown): Avatar {
  if (v && typeof v === 'object' && 'kind' in v) {
    const a = v as Record<string, unknown>;
    if (a.kind === 'photo' && typeof a.path === 'string') return { kind: 'photo', path: a.path };
    if (a.kind === 'buddy') return { ...DEFAULT_AVATAR, ...(a as Partial<Avatar>), kind: 'buddy' } as Avatar;
  }
  return DEFAULT_AVATAR;
}

const BUCKET = 'avatars';
// Signed links are cached for the session: the photo only changes when you change it.
const urls = new Map<string, string>();

/** A week-long private link to the photo (the bucket is private; only its owner can sign). */
export async function avatarUrl(path: string): Promise<string | null> {
  const hit = urls.get(path);
  if (hit) return hit;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 7 * 24 * 3600);
  if (error || !data) return null;
  urls.set(path, data.signedUrl);
  return data.signedUrl;
}

function bytesOf(base64: string) {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Lets you pick (or take) a square photo and uploads it to your own folder. Returns the new
 * avatar, or null if you backed out. Any previous photo is removed.
 */
export async function pickPhoto(source: 'library' | 'camera', previous?: Avatar): Promise<Avatar | null> {
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(source === 'camera' ? 'Allow the camera to take a photo.' : 'Allow photo access to choose a picture.');
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset?.base64) return null;

  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error('Sign in again to change your picture.');
  const type = asset.mimeType === 'image/png' ? 'image/png' : asset.mimeType === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const path = `${uid}/${Date.now()}.${type.split('/')[1].replace('jpeg', 'jpg')}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytesOf(asset.base64), { contentType: type });
  if (error) throw error;
  if (previous?.kind === 'photo') await removePhoto(previous.path);
  return { kind: 'photo', path };
}

export async function removePhoto(path: string) {
  urls.delete(path);
  await supabase.storage.from(BUCKET).remove([path]);
}

/** Every photo in your folder (used when deleting the account). */
export async function removeAllPhotos() {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return;
  const { data: files } = await supabase.storage.from(BUCKET).list(uid);
  if (files?.length) await supabase.storage.from(BUCKET).remove(files.map((f) => `${uid}/${f.name}`));
}
