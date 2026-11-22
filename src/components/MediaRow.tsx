import type { MouseEvent } from 'react';
import { useDesktopTiles } from '../lib/rowLayout';
import { cn } from '../lib/utils';
import { Link } from './Link';
import { type MediaFace, MediaFacts } from './MediaCard';
import { Photo } from './Photo';

export function MediaRow({
  href,
  photo,
  photoUrl,
  title,
  tag,
  meta,
  tags,
  figure,
  onClick,
}: MediaFace & { onClick?: (e: MouseEvent<HTMLAnchorElement>) => void }) {
  const tile = useDesktopTiles();
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group after:bg-line relative flex items-start gap-4 py-5 after:absolute after:right-0 after:bottom-0 after:left-[calc(clamp(88px,30vw,128px)+1rem)] after:h-px after:content-[''] md:items-stretch md:gap-6 md:py-8 md:after:left-[calc(clamp(220px,22vw,320px)+1.5rem)]",
        tile && 'md:h-full md:flex-col md:gap-0 md:py-0 md:after:hidden',
      )}
    >
      <Photo
        size={tile ? 'card' : 'row'}
        id={photo}
        src={photoUrl}
        cover={{ title, tag }}
        alt={title}
        className={cn(
          'rounded-photo aspect-square w-[clamp(88px,30vw,128px)] shrink-0 self-start md:aspect-[3/2] md:w-[clamp(220px,22vw,320px)]',
          tile && 'md:aspect-[4/3] md:w-full md:self-stretch',
        )}
      />
      <div
        className={cn(
          'flex min-h-[clamp(88px,30vw,128px)] max-w-2xl min-w-0 flex-1 flex-col md:min-h-0 md:py-2',
          tile && 'md:max-w-none md:pt-5 md:pb-0',
        )}
      >
        <h3
          className={cn(
            'group-hover:text-accent line-clamp-2 text-base leading-snug font-semibold tracking-tight md:text-[23px] md:leading-tight',
          )}
        >
          {title}
        </h3>
        <MediaFacts meta={meta} tags={tags} figure={figure} />
      </div>
    </Link>
  );
}
