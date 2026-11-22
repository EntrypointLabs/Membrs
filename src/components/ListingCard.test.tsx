import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import listingsFixture from '../fixtures/listings.json';
import { closesLine } from '../lib/dates';
import { priceText } from '../lib/text';
import type { EventListing, Listing, OpportunityListing } from '../lib/types';
import { ListingCard, priceKnown, shownPrice } from './ListingCard';

describe('ListingCard', () => {
  const samples = listingsFixture as Listing[];
  const event = samples.find((l) => l.kind === 'event') as EventListing;
  const opportunity = samples.find((l) => l.id === 'o1') as OpportunityListing;

  it('links to the listing and shows its price', () => {
    const html = renderToStaticMarkup(<ListingCard listing={event} />);
    expect(html).toContain(`href="/listing/${event.slug}"`);
    expect(html).toContain(event.title);
    expect(html).toContain(shownPrice(event));
  });

  it('says tickets are coming when an event has no price yet', () => {
    const unknown = { ...event, price: 'See site' } as typeof event;
    const html = renderToStaticMarkup(<ListingCard listing={unknown} />);
    expect(html).not.toContain('See site');
    expect(html).toContain('Tickets soon');
    expect(shownPrice(unknown)).toBe('Tickets soon');
    expect(priceKnown(unknown)).toBe(false);
  });

  it('leaves out an award the source never gave', () => {
    const brief = { ...opportunity, award: 'See brief' };
    const html = renderToStaticMarkup(<ListingCard listing={brief} />);
    expect(html).not.toContain('See brief');
    expect(html).not.toContain('Tickets soon');
    expect(shownPrice(brief)).toBe('');
  });

  it('shows the deadline and award for an opportunity', () => {
    const html = renderToStaticMarkup(<ListingCard listing={opportunity} />);
    expect(html).toContain(closesLine(opportunity));
    expect(html).toContain(priceText(opportunity.award));
  });

  it('never carries an Ad badge', () => {
    expect(renderToStaticMarkup(<ListingCard listing={event} />)).not.toMatch(
      />Ad</,
    );
  });
});
