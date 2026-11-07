interface PhotoProps {
  /** A photo id from the fixtures, such as "p9". */
  id: string;
  alt: string;
  className?: string;
  /** Load straight away. Only for what is on screen at first paint. */
  eager?: boolean;
}

/**
 * Every listing photo. Images live in public/images as WebP; the box sets the
 * shape and the photo covers it, so a card never jumps while one loads.
 */
export function Photo({ id, alt, className = '', eager = false }: PhotoProps) {
  return (
    <div className={`bg-soft overflow-hidden ${className}`}>
      <img
        src={`/images/${id}.webp`}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
