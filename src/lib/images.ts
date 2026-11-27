import { API_BASE } from './config';

export const RESIZED_PRESETS = {
  thumb: { width: 96, height: 96 },
  row: { width: 320, height: 214 },
  card: { width: 440, height: 330 },
  hero: { width: 960, height: 600 },
} as const;

export type ResizedPreset = keyof typeof RESIZED_PRESETS;

export interface ResizedPhoto {
  src: string;
  srcSet: string;
  width: number;
  height: number;
}

function isWebAddress(source: string): boolean {
  try {
    const { protocol } = new URL(source);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

export function resizedImageUrl(
  source: string,
  width: number,
  height: number,
): string {
  const query = new URLSearchParams({
    u: source,
    w: String(width),
    h: String(height),
    fit: 'cover',
  });
  return `${API_BASE}/v1/img?${query.toString()}`;
}

export function resizedPhoto(
  source: string,
  preset: ResizedPreset,
): ResizedPhoto | null {
  if (!API_BASE || !isWebAddress(source)) return null;
  const { width, height } = RESIZED_PRESETS[preset];
  const once = resizedImageUrl(source, width, height);
  const twice = resizedImageUrl(source, width * 2, height * 2);
  return { src: once, srcSet: `${once} 1x, ${twice} 2x`, width, height };
}

export function isResizedPreset(size: string): size is ResizedPreset {
  return size in RESIZED_PRESETS;
}
