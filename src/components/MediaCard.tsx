import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { Link } from './Link';
import { Photo } from './Photo';

export interface MediaFace {
  href: string;
  photo: string;
  photoUrl?: string;
  title: string;
  tag: string;
  meta: ReactNode;
  tags: ReactNode;
  figure?: string;
}

export function MediaFacts({
  meta,
  tags,
  figure,
  className,
}: Pick<MediaFace, 'meta' | 'tags' | 'figure'> & { className?: string }) {
  return (
    <div
      className={cn(
        'mt-auto flex flex-col items-start gap-1.5 pt-2 text-[13px] md:pt-3 md:text-[15px]',
        className,
      )}
    >
      <span className="text-fg-3 flex max-w-full min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-4">
        {meta}
      </span>
      <div className="mt-1.5 flex w-full items-center justify-between gap-3 md:mt-2.5">
        <div className="flex min-w-0">{tags}</div>
        {figure && (
          <span className="text-fg shrink-0 font-medium">{figure}</span>
        )}
      </div>
    </div>
  );
}

export function MediaCard({
  href,
  photo,
  photoUrl,
  title,
  tag,
  meta,
  tags,
  figure,
  compact = false,
  onClick,
}: MediaFace & { compact?: boolean; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="group flex flex-col">
      <Photo
        size="card"
        id={photo}
        src={photoUrl}
        cover={{ title, tag }}
        alt={title}
        className="rounded-photo aspect-[4/3]"
      />
      <h3
        className={cn(
          'group-hover:text-accent mt-3 line-clamp-2 text-base leading-snug font-semibold tracking-tight',
          !compact && 'md:mt-5 md:text-[23px] md:leading-tight',
        )}
      >
        {title}
      </h3>
      <MediaFacts
        meta={meta}
        tags={tags}
        figure={figure}
        className={cn(compact && 'md:pt-2 md:text-[13px]')}
      />
    </Link>
  );
}
