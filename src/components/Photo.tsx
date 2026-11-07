import photos from '../generated/photos.json';

interface PhotoMeta {
  w: number;
  h: number;
  widths: number[];
  blur: string;
}

const MANIFEST = photos as Record<string, PhotoMeta>;

/**
 * How wide a photo is drawn, so the browser downloads the smallest file that
 * still looks sharp. Each preset is a `sizes` attribute.
 */
const SIZES = {
  thumb: '96px',
  row: '(max-width: 760px) 80px, 22vw',
  card: '(max-width: 760px) 44vw, (max-width: 1280px) 30vw, 440px',
  tile: '(max-width: 760px) 50vw, 25vw',
  hero: '(max-width: 1024px) 100vw, 60vw',
  wide: '(max-width: 1440px) 100vw, 1440px',
} as const;

export type PhotoSize = keyof typeof SIZES;

interface PhotoProps {
  /** A photo id from the fixtures, such as "p9". */
  id: string;
  alt: string;
  className?: string;
  /** How wide it is drawn. Picks the files the browser chooses between. */
  size?: PhotoSize;
  /**
   * The one photo that is the largest thing on screen at first paint. It
   * loads eagerly with high fetch priority; everything else is lazy.
   */
  priority?: boolean;
}

function srcSet(id: string, widths: number[], format: 'avif' | 'webp'): string {
  return widths.map((w) => `/images/${id}-${w}.${format} ${w}w`).join(', ');
}

/**
 * Every photo on membrs. Served as AVIF with a WebP fallback, at five widths,
 * with its intrinsic size set so nothing shifts while it loads, and a 16px
 * blurred copy painted underneath so the box is never empty.
 */
export function Photo({
  id,
  alt,
  className = '',
  size = 'card',
  priority = false,
}: PhotoProps) {
  const meta = MANIFEST[id];
  if (!meta)
    return (
      <div className={`bg-soft ${className}`} role="img" aria-label={alt} />
    );
  const fallback = meta.widths.find((w) => w >= 640) ?? meta.widths.at(-1);
  return (
    <div
      className={`bg-soft overflow-hidden bg-cover bg-center ${className}`}
      style={{ backgroundImage: `url(${meta.blur})` }}
    >
      <picture>
        <source
          type="image/avif"
          srcSet={srcSet(id, meta.widths, 'avif')}
          sizes={SIZES[size]}
        />
        <source
          type="image/webp"
          srcSet={srcSet(id, meta.widths, 'webp')}
          sizes={SIZES[size]}
        />
        <img
          src={`/images/${id}-${fallback}.webp`}
          alt={alt}
          width={meta.w}
          height={meta.h}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          className="h-full w-full object-cover"
        />
      </picture>
    </div>
  );
}
