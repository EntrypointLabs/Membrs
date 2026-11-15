import { useEffect, useState } from 'react';
import {
  area,
  context,
  itemRef,
  track,
  trackItemOpened,
} from '../lib/analytics';
import { closesLine, eventDay } from '../lib/dates';
import { paths } from '../lib/router';
import type { Listing } from '../lib/types';
import { Icon } from './Icon';
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
  const [held, setHeld] = useState(false);
  const [stopped, setStopped] = useState(false);
  const paused = held || stopped;
  useEffect(() => {
    if (picks.length < 2 || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % picks.length), 6000);
    return () => clearInterval(id);
  }, [picks.length, paused]);
  const pick = picks[index];
  if (!pick) return null;
  return (
    <div
      {...area('hero')}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false);
      }}
    >
      <Link
        href={paths.listing(pick.id)}
        onClick={(e) =>
          trackItemOpened(e.currentTarget, itemRef.listing(pick), 'hero')
        }
        className="group block"
      >
        <div className="relative">
          <Photo
            size="hero"
            id={pick.photo}
            src={pick.photoUrl}
            cover={{ title: pick.title, tag: pick.category }}
            alt={pick.title}
            priority
            className="rounded-photo aspect-[16/10]"
          />
        </div>
        <h2 className="group-hover:text-accent mt-6 text-[clamp(28px,2.6vw,44px)] leading-tight font-semibold tracking-tight">
          {pick.title}
        </h2>
      </Link>
      <div className="mt-3 flex items-end justify-between gap-6">
        <div>
          <p className="text-fg-2 max-w-xl">{pick.blurb}</p>
          <p className="text-fg-3 mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
            {pick.kind === 'event' ? (
              <>
                <Meta icon="cal">{eventDay(pick)}</Meta>
                <Meta icon="pin">{pick.city}</Meta>
              </>
            ) : (
              <>
                <Meta icon="clock">{closesLine(pick)}</Meta>
                <Meta icon="org">{pick.organiser}</Meta>
              </>
            )}
          </p>
          <Kicker listing={pick} mixed className="mt-4" />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {picks.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                track('hero_paused', { paused: !stopped }, e.currentTarget);
                setStopped(!stopped);
              }}
              aria-label={stopped ? 'Play slideshow' : 'Pause slideshow'}
              aria-pressed={stopped}
              {...context({ action: 'slideshow_toggle' })}
              className="text-fg-3 hover:text-fg mr-1 grid h-6 w-6 place-items-center rounded-md"
            >
              <Icon name={stopped ? 'play' : 'pause'} className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="flex gap-1.5" role="tablist" aria-label="Featured">
            {picks.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={p.title}
                onClick={(e) => {
                  track(
                    'hero_slide_selected',
                    { index: i + 1, item_id: p.id },
                    e.currentTarget,
                  );
                  setIndex(i);
                }}
                className={`ease-out-strong h-1.5 rounded-full transition-[width,background-color] duration-200 ${i === index ? 'bg-fg w-6' : 'bg-fg-4 w-1.5'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
