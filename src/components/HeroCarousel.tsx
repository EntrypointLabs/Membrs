import { useCallback, useEffect, useState } from 'react';
import {
  area,
  context,
  itemRef,
  track,
  trackItemOpened,
} from '../lib/analytics';
import { closesLine, eventDay } from '../lib/dates';
import { paths } from '../lib/router';
import type { ListingSummary } from '../lib/types';
import { Icon } from './Icon';
import { Kicker } from './Kicker';
import { Link } from './Link';
import { Meta } from './ListingCard';
import { Photo } from './Photo';

const SLIDE_MS = 6000;
const LONGEST_PHOTO_WAIT_MS = 1500;
const photoLoads = new Map<string, Promise<void>>();

function photoReady(url: string): Promise<void> {
  const known = photoLoads.get(url);
  if (known) return known;
  const loaded = new Promise<void>((done) => {
    const img = new Image();
    img.onload = img.onerror = () => done();
    img.referrerPolicy = 'no-referrer';
    img.src = url;
    setTimeout(done, LONGEST_PHOTO_WAIT_MS);
  });
  photoLoads.set(url, loaded);
  return loaded;
}

/**
 * The home page's lead story: a few picks that rotate every six seconds.
 * The text sits below the photo, never on it, so every photo stays readable.
 */
export function HeroCarousel({ picks }: { picks: ListingSummary[] }) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [stopped, setStopped] = useState(false);
  const paused = held || stopped;
  const urls = picks.map((p) => p.photoUrl ?? '').join(' ');
  useEffect(() => {
    for (const url of urls.split(' ').filter(Boolean)) void photoReady(url);
  }, [urls]);
  const show = useCallback(
    (next: number) => {
      const url = picks[next]?.photoUrl;
      void (url ? photoReady(url) : Promise.resolve()).then(() =>
        setIndex(next),
      );
    },
    [picks],
  );
  useEffect(() => {
    if (picks.length < 2 || paused) return;
    const id = setTimeout(() => show((index + 1) % picks.length), SLIDE_MS);
    return () => clearTimeout(id);
  }, [index, picks.length, paused, show]);
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
        href={paths.listing(pick.slug)}
        onClick={(e) =>
          trackItemOpened(e.currentTarget, itemRef.listing(pick), 'hero')
        }
        className="group block"
      >
        <div className="relative">
          <Photo
            key={pick.id}
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
        <div className="min-w-0 flex-1">
          <p className="text-fg-2 line-clamp-3">{pick.blurb}</p>
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
                  show(i);
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
