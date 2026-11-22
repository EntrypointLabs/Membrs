import { useEffect } from 'react';
import { area, context, itemRef, track, type Events } from '../lib/analytics';
import { listingByKey, similar } from '../lib/api';
import {
  deadlineCalendarHref,
  downloadIcs,
  googleCalendarHref,
} from '../lib/calendar';
import { eventDay, hasDeadline } from '../lib/dates';
import { navigate, paths } from '../lib/router';
import { toast } from '../lib/ui';
import { rememberViewed } from '../lib/viewed';
import { daysLeftLine, distinctParts, slugify, sourceName } from '../lib/text';
import type { EventListing, Listing, OpportunityListing } from '../lib/types';
import { ListingCard, priceKnown, shownPrice } from '../components/ListingCard';
import { Icon } from '../components/Icon';
import { Rail } from '../components/Rail';
import { SectionHeader } from '../components/SectionHeader';
import {
  AboutBlock,
  ActionCard,
  AskAIMenu,
  AssistantLogos,
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
  SMALL_BUTTON,
  SmallButton,
} from './DetailParts';
import { SeeAll } from '../components/PhoneList';
import { NotFoundScreen } from './NotFoundScreen';

export function ListingScreen({ id }: { id: string }) {
  const listing = listingByKey(id);
  useEffect(() => {
    if (!listing) return;
    rememberViewed(listing.id);
    if (listing.slug && id !== listing.slug)
      navigate(paths.listing(listing.slug), { replace: true });
  }, [listing, id]);
  if (!listing) return <NotFoundScreen />;
  const feed = listing.kind === 'event' ? 'events' : 'opportunities';
  const more = similar(listing);
  const item = itemRef.listing(listing);
  const cta = listing.kind === 'event' ? 'get_ticket' : 'apply_now';
  return (
    <div className="page max-md:pt-0 md:pt-10" {...context(item)}>
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
        map={
          listing.kind === 'event' &&
          listing.venue !== 'Venue TBA' && (
            <MapCard name={listing.venue} area={whereLine(listing)} />
          )
        }
        primary={
          <PrimaryLink href={listing.url} item={item} cta={cta}>
            {listing.kind === 'event' ? 'Get ticket' : 'Apply now'}
          </PrimaryLink>
        }
        tail={
          <div className="mt-8 flex flex-wrap gap-2 md:mt-10">
            {[
              ...new Set(
                [
                  listing.category,
                  listing.city,
                  listing.kind === 'event'
                    ? listing.free
                      ? 'Free'
                      : priceKnown(listing)
                        ? 'Paid'
                        : ''
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
        }
        links={
          <>
            <LinkRow
              icon="spark"
              label="Find similar"
              action="find_similar"
              href={paths.category(slugify(listing.category))}
              onClick={(e) =>
                track('find_similar_clicked', item, e.currentTarget)
              }
            />
            <LinkRow
              icon="share"
              label="Share with a friend"
              action="share"
              onClick={(e) =>
                shareAndConfirm(listing.title, item, e.currentTarget)
              }
            />
            <LinkRow
              icon="compose"
              label="Ask AI about this"
              action="ask_ai"
              wrap={(control) => (
                <AskAIMenu kind={listing.kind} title={listing.title}>
                  {control}
                </AskAIMenu>
              )}
            />
          </>
        }
      >
        <dl {...area('facts')}>
          {listing.kind === 'event' ? (
            <EventFacts e={listing} />
          ) : (
            <OpportunityFacts o={listing} />
          )}
        </dl>
      </DetailBody>

      {more.length > 0 && (
        <section
          className="mt-[clamp(100px,8vw,160px)]"
          {...area('more_like_this')}
        >
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

function calendarAdded(
  listing: Listing,
  method: Events['calendar_added']['method'],
  from: Element,
): void {
  track('calendar_added', { ...itemRef.listing(listing), method }, from);
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
          <FactAction
            href={googleCalendarHref(e)}
            icon="cal"
            action="add_to_calendar_google"
            onClick={(ev) => calendarAdded(e, 'google', ev.currentTarget)}
          >
            Add to calendar
          </FactAction>
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
                icon="pin"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.venue, whereLine(e)].filter(Boolean).join(', '))}`}
                action="directions"
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
          {!e.free && priceKnown(e) && e.source.trim() && (
            <p className="text-fg-3 text-[15px]">
              Sold by {sourceName(e.source)}
            </p>
          )}
        </Fact>
      )}
    </>
  );
}

function confirmReminder() {
  toast('Opened Google Calendar in a new tab. Save the reminder there.');
}

function OpportunityFacts({ o }: { o: OpportunityListing }) {
  return (
    <>
      <Fact
        label="Deadline"
        action={
          hasDeadline(o) &&
          o.daysLeft >= 0 && (
            <FactAction
              href={deadlineCalendarHref(o)}
              icon="clock"
              action="remind_me"
              onClick={(e) => {
                calendarAdded(o, 'deadline_reminder', e.currentTarget);
                confirmReminder();
              }}
            >
              Remind me
            </FactAction>
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
  const item = itemRef.listing(listing);
  const shareButton = (
    <OverlayButton
      icon="share"
      label="Share"
      action="share"
      onClick={(e) => shareAndConfirm(listing.title, item, e.currentTarget)}
    />
  );
  if (listing.kind === 'event') {
    return (
      <>
        {shareButton}
        <OverlayMenu
          icon="cal"
          label="Add to calendar"
          action="calendar_menu"
          items={[
            {
              label: 'Google Calendar',
              action: 'add_to_calendar_google',
              href: googleCalendarHref(listing),
              onSelect: (from) => calendarAdded(listing, 'google', from),
            },
            {
              label: 'Apple or Outlook',
              action: 'add_to_calendar_ics',
              onSelect: (from) => {
                calendarAdded(listing, 'ics', from);
                downloadIcs(listing);
              },
            },
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
          action="remind_me"
          href={deadlineCalendarHref(listing)}
          onClick={(e) => {
            calendarAdded(listing, 'deadline_reminder', e.currentTarget);
            confirmReminder();
          }}
        />
      )}
    </>
  );
}

function Sidebar({ listing }: { listing: Listing }) {
  const event = listing.kind === 'event';
  const item = itemRef.listing(listing);
  return (
    <ActionCard>
      <PrimaryLink
        href={listing.url}
        item={item}
        cta={event ? 'get_ticket' : 'apply_now'}
      >
        {event ? 'Get ticket' : 'Apply now'}
      </PrimaryLink>
      <div className="mt-3 grid grid-cols-2 gap-2 [&>:last-child:nth-child(odd)]:col-span-2">
        {event && (
          <SmallButton
            href={googleCalendarHref(listing)}
            action="add_to_calendar_google"
            onClick={(e) => calendarAdded(listing, 'google', e.currentTarget)}
          >
            Google Calendar
          </SmallButton>
        )}
        {event && (
          <SmallButton
            onClick={(e) => {
              calendarAdded(listing, 'ics', e.currentTarget);
              downloadIcs(listing);
            }}
            action="add_to_calendar_ics"
          >
            Apple or Outlook
          </SmallButton>
        )}
        <SmallButton
          href={paths.category(slugify(listing.category))}
          action="find_similar"
          onClick={(e) => track('find_similar_clicked', item, e.currentTarget)}
        >
          Find similar
        </SmallButton>
        <SmallButton
          action="share"
          onClick={(e) => shareAndConfirm(listing.title, item, e.currentTarget)}
        >
          Share
        </SmallButton>
        <AskAIMenu kind={listing.kind} title={listing.title}>
          <button type="button" className={`${SMALL_BUTTON} gap-2`}>
            <AssistantLogos />
            Ask AI
            <Icon name="chevronDown" className="h-3.5 w-3.5" />
          </button>
        </AskAIMenu>
      </div>
    </ActionCard>
  );
}
