import { useEffect, useState } from 'react';
import { shortDay } from '../lib/dates';
import { paths } from '../lib/router';
import type { Listing } from '../lib/types';
import { Kicker } from './Kicker';
import { Link } from './Link';
import { Meta } from './ListingCard';
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
  return (
    <div>
      <Link href={paths.listing(pick.id)} className="group block">
        <div className="relative">
          <Photo
            size="hero"
            id={pick.photo}
            src={pick.photoUrl}
            alt={pick.title}
            priority
            className="aspect-[16/10] rounded-lg"
          />
        </div>
        <Kicker listing={pick} mixed className="mt-6" />
        <h2 className="group-hover:text-accent mt-2 text-[clamp(28px,2.6vw,44px)] leading-tight font-semibold tracking-tight">
          {pick.title}
        </h2>
      </Link>
      <div className="mt-3 flex items-end justify-between gap-6">
        <div>
          <p className="text-fg-2 max-w-xl">{pick.blurb}</p>
          <p className="text-fg-3 mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
            {pick.kind === 'event' ? (
              <>
                <Meta icon="cal">{shortDay(pick.date)}</Meta>
                <Meta icon="pin">{pick.city}</Meta>
              </>
            ) : (
              <>
                <Meta icon="clock">{`Closes ${shortDay(pick.deadline)}`}</Meta>
                <Meta icon="org">{pick.organiser}</Meta>
              </>
            )}
          </p>
        </div>
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
