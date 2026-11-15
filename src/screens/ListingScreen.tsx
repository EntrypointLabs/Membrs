import { listingById, similar } from '../lib/api';
import {
  deadlineCalendarHref,
  downloadIcs,
  googleCalendarHref,
} from '../lib/calendar';
import { eventDay, hasDeadline } from '../lib/dates';
import { paths } from '../lib/router';
import { daysLeftLine, distinctParts, slugify, sourceName } from '../lib/text';
import type { EventListing, Listing, OpportunityListing } from '../lib/types';
import { ListingCard, shownPrice } from '../components/ListingCard';
import { Rail } from '../components/Rail';
import { SectionHeader } from '../components/SectionHeader';
import {
  AboutBlock,
  ActionCard,
  DetailBody,
  DetailHead,
  Fact,
  FactAction,
  LinkRow,
  MapCard,
  OverlayButton,
  OverlayMenu,
  PrimaryLink,
  shareAndConfirm,
  SmallButton,
} from './DetailParts';
import { SeeAll } from './HomeScreen';
import { NotFoundScreen } from './NotFoundScreen';

export function ListingScreen({ id }: { id: string }) {
  const listing = listingById(id);
  if (!listing) return <NotFoundScreen />;
  const feed = listing.kind === 'event' ? 'events' : 'opportunities';
  const more = similar(listing);
  return (
    <div className="page max-md:pt-0 md:pt-10">
      <DetailHead
        trail={[
          [
            listing.kind === 'event' ? 'Events' : 'Opportunities',
            paths.feed(feed),
          ],
          [listing.category, paths.category(slugify(listing.category))],
        ]}
        title={listing.title}
        photo={{
          id: listing.photo,
          src: listing.photoUrl,
          cover: { title: listing.title, tag: listing.category },
        }}
        tools={<HeadTools listing={listing} />}
      />

      <DetailBody
        about={
          <AboutBlock
            title={
              listing.kind === 'event'
                ? 'About This Event'
                : 'About This Opportunity'
            }
            paragraphs={listing.about ?? [listing.blurb]}
            className=""
          />
        }
        action={<Sidebar listing={listing} />}
        primary={
          <PrimaryLink href={listing.url}>
            {listing.kind === 'event' ? 'Get ticket' : 'Apply now'}
          </PrimaryLink>
        }
        links={
          <>
            <LinkRow
              icon="spark"
              label="Find similar"
              href={paths.category(slugify(listing.category))}
            />
            <LinkRow
              icon="share"
              label="Share with a friend"
              onClick={() => shareAndConfirm(listing.title)}
            />
          </>
        }
      >
        <dl>
          {listing.kind === 'event' ? (
            <EventFacts e={listing} />
          ) : (
            <OpportunityFacts o={listing} />
          )}
        </dl>
        <div className="mt-10 flex flex-wrap gap-2">
          {[
            ...new Set(
              [
                listing.category,
                listing.city,
                listing.kind === 'event'
                  ? listing.free
                    ? 'Free'
                    : shownPrice(listing) && 'Paid'
                  : listing.mode,
              ].filter(Boolean),
            ),
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
          <MapCard name={listing.venue} area={whereLine(listing)} />
        )}
      </DetailBody>

      {more.length > 0 && (
        <section className="mt-[clamp(100px,8vw,160px)]">
          <SectionHeader
            title="More like this"
            count={more.length}
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

function whereLine(e: EventListing): string {
  return distinctParts(e.venue, [e.area, e.city]).join(', ');
}

function EventFacts({ e }: { e: EventListing }) {
  return (
    <>
      <Fact
        label="Date"
        action={
          <FactAction href={googleCalendarHref(e)}>Add to calendar</FactAction>
        }
      >
        <p className="font-semibold">{eventDay(e, true)}</p>
        <p className="text-fg-3 text-[15px]">{e.time}, local time</p>
      </Fact>
      {e.mode === 'Remote' ? (
        <Fact label="Venue">
          <p className="font-semibold">Online</p>
        </Fact>
      ) : (
        <Fact
          label="Venue"
          action={
            e.venue !== 'Venue TBA' && (
              <FactAction
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.venue, whereLine(e)].filter(Boolean).join(', '))}`}
              >
                Directions
              </FactAction>
            )
          }
        >
          <p className="font-semibold">{e.venue}</p>
          {whereLine(e) && (
            <p className="text-fg-3 text-[15px]">{whereLine(e)}</p>
          )}
        </Fact>
      )}
      <Fact label="Format">
        <p className="font-semibold">{e.mode}</p>
        {e.host.trim() && (
          <p className="text-fg-3 text-[15px]">Hosted by {e.host}</p>
        )}
      </Fact>
      {shownPrice(e) && (
        <Fact label="Price">
          <p className="font-semibold">{shownPrice(e)}</p>
          {!e.free && e.source.trim() && (
            <p className="text-fg-3 text-[15px]">
              Sold by {sourceName(e.source)}
            </p>
          )}
        </Fact>
      )}
    </>
  );
}

function OpportunityFacts({ o }: { o: OpportunityListing }) {
  return (
    <>
      <Fact
        label="Deadline"
        action={
          hasDeadline(o) &&
          o.daysLeft >= 0 && (
            <FactAction href={deadlineCalendarHref(o)}>Remind me</FactAction>
          )
        }
      >
        <p className="font-semibold">Closes {o.deadline.label}</p>
        {hasDeadline(o) && (
          <p className="text-fg-3 text-[15px]">{daysLeftLine(o.daysLeft)}</p>
        )}
      </Fact>
      {shownPrice(o) && (
        <Fact label="Award">
          <p className="font-semibold">{shownPrice(o)}</p>
        </Fact>
      )}
      {o.organiser && (
        <Fact label="Offered by">
          <p className="font-semibold">{o.organiser}</p>
          <p className="text-fg-3 text-[15px]">
            {o.remote ? 'Remote' : o.city}
          </p>
        </Fact>
      )}
      {o.level && (
        <Fact label="Level">
          <p className="font-semibold">{o.level}</p>
        </Fact>
      )}
      {o.eligibility.length > 0 && (
        <Fact label="Who can apply">
          <p className="font-semibold">Who can apply</p>
          {o.eligibility.map((line) => (
            <p key={line} className="text-fg-3 text-[15px] break-words">
              {line}
            </p>
          ))}
        </Fact>
      )}
    </>
  );
}

function HeadTools({ listing }: { listing: Listing }) {
  const shareButton = (
    <OverlayButton
      icon="share"
      label="Share"
      onClick={() => shareAndConfirm(listing.title)}
    />
  );
  if (listing.kind === 'event') {
    return (
      <>
        {shareButton}
        <OverlayMenu
          icon="cal"
          label="Add to calendar"
          items={[
            { label: 'Google Calendar', href: googleCalendarHref(listing) },
            { label: 'Apple or Outlook', onSelect: () => downloadIcs(listing) },
          ]}
        />
      </>
    );
  }
  return (
    <>
      {shareButton}
      {hasDeadline(listing) && listing.daysLeft >= 0 && (
        <OverlayButton
          icon="cal"
          label="Remind me before it closes"
          href={deadlineCalendarHref(listing)}
        />
      )}
    </>
  );
}

function Sidebar({ listing }: { listing: Listing }) {
  const event = listing.kind === 'event';
  return (
    <ActionCard>
      <PrimaryLink href={listing.url}>
        {event ? 'Get ticket' : 'Apply now'}
      </PrimaryLink>
      <div className="mt-3 grid grid-cols-2 gap-2 [&>:last-child:nth-child(odd)]:col-span-2">
        {event && (
          <SmallButton href={googleCalendarHref(listing)}>
            Google Calendar
          </SmallButton>
        )}
        {event && (
          <SmallButton onClick={() => downloadIcs(listing)}>
            Apple or Outlook
          </SmallButton>
        )}
        <SmallButton href={paths.category(slugify(listing.category))}>
          Find similar
        </SmallButton>
        <SmallButton onClick={() => shareAndConfirm(listing.title)}>
          Share
        </SmallButton>
      </div>
    </ActionCard>
  );
}
