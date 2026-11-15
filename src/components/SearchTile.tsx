import type { MouseEvent } from 'react';
import type { SearchTileData } from '../lib/searchShelves';
import { Link } from './Link';
import { Photo } from './Photo';

export function SearchTile({
  tile,
  onClick,
}: {
  tile: SearchTileData;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      href={tile.href}
      onClick={onClick}
      className="group bg-soft hover:bg-soft-hover flex items-center gap-4 rounded-lg p-2 pr-4"
    >
      <Photo
        size="thumb"
        id={tile.photo}
        src={tile.photoUrl}
        cover={{ title: tile.label, tag: tile.tag }}
        alt=""
        className="rounded-photo aspect-square w-16 shrink-0 md:w-20"
      />
      <span className="min-w-0">
        <span className="group-hover:text-accent line-clamp-2 text-[15px] leading-snug font-medium md:text-base">
          {tile.label}
        </span>
        {tile.detail && (
          <span className="text-fg-3 mt-0.5 block truncate text-[13px]">
            {tile.detail}
          </span>
        )}
      </span>
    </Link>
  );
}
