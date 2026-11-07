import { useEffect, useState } from 'react';
import { eventTag, shortDay } from '../lib/dates';
import { paths } from '../lib/router';
import type { Listing } from '../lib/types';
import { Link } from './Link';
import { Photo } from './Photo';

/**
 * The home page's lead story: a few picks that rotate every six seconds.
 * The text sits below the photo, never on it, so every photo stays readable.
 */
export function HeroCarousel({ picks }: { picks: Listing[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (picks.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % picks.length), 6000);
    return () => clearInterval(id);
  }, [picks.length]);
  const pick = picks[index];
  if (!pick) return null;
  const tag = pick.kind === 'event' ? eventTag(pick) : `${pick.daysLeft}d left`;
  return (
    <div>
      <Link href={paths.listing(pick.id)} className="group block">
        <div className="relative">
          <Photo
            id={pick.photo}
            alt={pick.title}
            eager
            className="aspect-[16/10] rounded-lg"
          />
          <span className="absolute top-4 left-4 rounded-sm bg-black/55 px-2.5 py-1 text-xs font-bold tracking-wide text-white uppercase backdrop-blur">
            {pick.category}
          </span>
          {tag && (
            <span className="absolute top-4 right-4 rounded-sm bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
              {tag}
            </span>
          )}
        </div>
        <p className="text-fg-3 mt-6 text-sm font-semibold tracking-wide uppercase">
          {pick.kind === 'event'
            ? shortDay(pick.date)
            : `Closes ${shortDay(pick.deadline)}`}{' '}
          / {pick.city}
        </p>
        <h2 className="group-hover:text-accent mt-2 text-[clamp(28px,2.6vw,44px)] leading-tight font-semibold tracking-tight">
          {pick.title}
        </h2>
      </Link>
      <div className="mt-3 flex items-end justify-between gap-6">
        <p className="text-fg-2 max-w-xl">{pick.blurb}</p>
        <div
          className="flex shrink-0 gap-1.5"
          role="tablist"
          aria-label="Featured"
        >
          {picks.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={p.title}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'bg-fg w-6' : 'bg-fg-4 w-1.5'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
