import { shown } from './sections';
import type { ContributeKind } from './types';

export const CONTRIBUTE_KINDS: { value: ContributeKind; label: string }[] = (
  [
    { value: 'event', label: 'Event' },
    { value: 'opportunity', label: 'Opportunity' },
    { value: 'place', label: 'Place' },
    { value: 'promo', label: 'Promo' },
    { value: 'ad', label: 'Advertise' },
  ] as const
).filter((k) => shown(k.value));

export function localIsoDate(day: Date): string {
  const month = String(day.getMonth() + 1).padStart(2, '0');
  const date = String(day.getDate()).padStart(2, '0');
  return `${day.getFullYear()}-${month}-${date}`;
}

export function isWebLink(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') && !!url.host
    );
  } catch {
    return false;
  }
}

export function withScheme(value: string): string {
  const trimmed = value.trim();
  if (!/^[^\s/.:@]+(\.[^\s/.:@]+)+(:\d+)?([/?#]\S*)?$/.test(trimmed))
    return trimmed;
  return `https://${trimmed}`;
}

export const LINK_HINT = 'Enter a web link, like https://example.com';

export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export interface PhotoFacts {
  type: string;
  size: number;
  width: number;
  height: number;
}

export function photoProblem(
  photo: PhotoFacts,
  types: Set<string>,
): string | null {
  if (!types.has(photo.type)) return 'Use a JPG, PNG or WebP photo.';
  if (photo.size > PHOTO_MAX_BYTES) return 'Use a photo under 10 MB.';
  if (!photo.width || !photo.height) return 'Could not open that photo.';
  return null;
}

export function readPhotoFacts(file: Blob): Promise<PhotoFacts> {
  const facts = { type: file.type, size: file.size, width: 0, height: 0 };
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    const done = (width: number, height: number) => {
      URL.revokeObjectURL(url);
      resolve({ ...facts, width, height });
    };
    image.onload = () => done(image.naturalWidth, image.naturalHeight);
    image.onerror = () => done(0, 0);
    image.src = url;
  });
}
