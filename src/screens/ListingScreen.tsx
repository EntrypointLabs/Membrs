import { listingById, similar } from '../lib/api';
import { shortDay } from '../lib/dates';
import { paths } from '../lib/router';
import { slugify } from '../lib/text';
import { toast } from '../lib/ui';
import type { EventListing, Listing, OpportunityListing } from '../lib/types';
import { Icon } from '../components/Icon';
import { ListingCard, priceOf } from '../components/ListingCard';
import { Photo } from '../components/Photo';
import { Rail } from '../components/Rail';
import { SectionHeader } from '../components/SectionHeader';
import {
  ActionCard,
  Block,
  Crumbs,
  Fact,
  FactAction,
  MapCard,
  share,
  SmallButton,
} from './DetailParts';
import { SeeAll } from './HomeScreen';
import { NotFoundScreen } from './NotFoundScreen';

/** A Google Calendar link for an event, prefilled from the listing. */
function calendarHref(e: EventListing): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    details: `${e.blurb}\n\n${e.url}`,
    location: `${e.venue}, ${e.area}`,
  });
  if (e.startsAt && e.endsAt) {
    const compact = (iso: string) =>
      iso.replace(/[-:]/g, '').replace('.000', '');
    params.set('dates', `${compact(e.startsAt)}/${compact(e.endsAt)}`);
  }
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function ListingScreen({ id }: { id: string }) {
  const listing = listingById(id);
  if (!listing) return <NotFoundScreen />;
  const feed = listing.kind === 'event' ? 'events' : 'opportunities';
  const more = similar(listing);
  return (
    <div className="page pt-6 md:pt-10">
      <Crumbs
        trail={[
          [
            listing.kind === 'event' ? 'Events' : 'Opportunities',
            paths.feed(feed),
          ],
          [listing.category, paths.category(slugify(listing.category))],
        ]}
      />
      <header className="mt-8 max-w-4xl">
        <h1 className="text-[clamp(34px,4.4vw,72px)] leading-[1.02] font-semibold tracking-tight">
          {listing.title}
        </h1>
        <p className="text-fg-2 mt-4 max-w-2xl text-lg">{listing.blurb}</p>
      </header>
      <Photo
        id={listing.photo}
        alt={listing.title}
        eager
        className="mt-10 aspect-[2/1] rounded-lg"
      />

      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_clamp(360px,24vw,460px)] lg:gap-16">
        <div>
          <dl className="border-line border-t">
            {listing.kind === 'event' ? (
              <EventFacts e={listing} />
            ) : (
              <OpportunityFacts o={listing} />
            )}
          </dl>
          {listing.kind === 'opportunity' && listing.eligibility.length > 0 && (
            <Block title="Who can apply">
              <ul className="text-fg-2 flex flex-col gap-3">
                {listing.eligibility.map((line) => (
                  <li key={line} className="flex gap-3">
                    <Icon name="check" className="text-open mt-1 shrink-0" />
                    <span className="min-w-0 break-words">{line}</span>
                  </li>
                ))}
              </ul>
            </Block>
          )}
          <p className="text-fg-3 mt-10 text-[15px]">
            Listed on <b className="text-fg">{listing.source}</b> · from public
            listings, confirm with the organiser
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              listing.category,
              listing.city,
              listing.kind === 'event'
                ? listing.free
                  ? 'Free'
                  : 'Paid'
                : listing.mode,
            ].map((t) => (
              <span
                key={t}
                className="bg-btn rounded-sm px-3 py-1.5 text-sm font-medium"
              >
                {t}
              </span>
            ))}
          </div>
          {listing.kind === 'event' && listing.venue !== 'Venue TBA' && (
            <MapCard
              name={listing.venue}
              area={`${listing.area}, ${listing.city}`}
            />
          )}
        </div>
        <Sidebar listing={listing} />
      </div>

      {more.length > 0 && (
        <section className="mt-[clamp(100px,8vw,160px)]">
          <SectionHeader
            title="More like this"
            actions={
              <SeeAll
                href={paths.category(slugify(listing.category))}
              >{`More ${listing.category}`}</SeeAll>
            }
          />
          <Rail>
            {more.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </Rail>
        </section>
      )}
    </div>
  );
}

function EventFacts({ e }: { e: EventListing }) {
  return (
    <>
      <Fact
        label="Date"
        action={<FactAction href={calendarHref(e)}>Add to calendar</FactAction>}
      >
        <p className="font-semibold">{shortDay(e.date)} 2026</p>
        <p className="text-fg-3 text-[15px]">{e.time}, local time</p>
      </Fact>
      <Fact
        label="Venue"
        action={
          <FactAction
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.venue}, ${e.area}`)}`}
          >
            Directions
          </FactAction>
        }
      >
        <p className="font-semibold">{e.venue}</p>
        <p className="text-fg-3 text-[15px]">
          {e.area}, {e.city}
        </p>
      </Fact>
      <Fact label="Format">
        <p className="font-semibold">{e.mode}</p>
        <p className="text-fg-3 text-[15px]">Hosted by {e.host}</p>
      </Fact>
      <Fact label="Price">
        <p className="font-semibold">{e.price}</p>
        <p className="text-fg-3 text-[15px]">Sold by {e.source}</p>
      </Fact>
    </>
  );
}

function OpportunityFacts({ o }: { o: OpportunityListing }) {
  return (
    <>
      <Fact label="Deadline">
        <p className="font-semibold">{o.deadline.label}</p>
        <p className="text-fg-3 text-[15px]">{o.daysLeft} days left</p>
      </Fact>
      <Fact label="Award">
        <p className="font-semibold">{o.award}</p>
      </Fact>
      <Fact label="Offered by">
        <p className="font-semibold">{o.organiser}</p>
        <p className="text-fg-3 text-[15px]">
          {o.remote ? 'Remote, open internationally' : o.city}
        </p>
      </Fact>
      {o.level && (
        <Fact label="Level">
          <p className="font-semibold">{o.level}</p>
        </Fact>
      )}
    </>
  );
}

function Sidebar({ listing }: { listing: Listing }) {
  const event = listing.kind === 'event';
  const onShare = async () => {
    if ((await share(listing.title)) === 'copied') toast('Link copied');
  };
  return (
    <ActionCard>
      <p className="text-fg-3 text-sm">
        {event ? (listing.free ? 'Entry' : 'From') : 'Award'}
      </p>
      <p className="text-3xl font-semibold tracking-tight">
        {priceOf(listing)}
      </p>
      <a
        href={listing.url}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-brand hover:bg-brand-hover mt-5 flex h-12 items-center justify-center gap-1.5 rounded-md font-bold text-white"
      >
        {event ? 'Get ticket' : 'Apply now'}{' '}
        <Icon name="arrowUpRight" className="h-3.5 w-3.5" />
      </a>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {event && (
          <SmallButton href={calendarHref(listing)}>Calendar</SmallButton>
        )}
        <SmallButton href={paths.category(slugify(listing.category))}>
          Find similar
        </SmallButton>
        <SmallButton onClick={onShare}>Share</SmallButton>
        {!event && <SmallButton href={listing.url}>Details</SmallButton>}
      </div>
      <p className="text-fg-3 mt-5 text-sm">
        No account needed. Add it to your calendar and it is filled in for you.
      </p>
    </ActionCard>
  );
}
