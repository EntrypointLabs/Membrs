import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import listingsFixture from '../fixtures/listings.json';
import { closesLine } from '../lib/dates';
import type { EventListing, Listing, OpportunityListing } from '../lib/types';
import { ListingCard, shownPrice } from './ListingCard';

describe('ListingCard', () => {
  const samples = listingsFixture as Listing[];
  const event = samples.find((l) => l.kind === 'event') as EventListing;
  const opportunity = samples.find((l) => l.id === 'o1') as OpportunityListing;

  it('links to the listing and shows its price', () => {
    const html = renderToStaticMarkup(<ListingCard listing={event} />);
    expect(html).toContain(`href="/listing/${event.id}"`);
    expect(html).toContain(event.title);
    expect(html).toContain(shownPrice(event));
  });

  it('leaves out a price the source never gave', () => {
    const unknown = { ...event, price: 'See site' } as typeof event;
    const brief = { ...opportunity, award: 'See brief' };
    expect(
      renderToStaticMarkup(<ListingCard listing={unknown} />),
    ).not.toContain('See site');
    expect(renderToStaticMarkup(<ListingCard listing={brief} />)).not.toContain(
      'See brief',
    );
  });

  it('shows the deadline and award for an opportunity', () => {
    const html = renderToStaticMarkup(<ListingCard listing={opportunity} />);
    expect(html).toContain(closesLine(opportunity));
    expect(html).toContain(opportunity.award);
  });

  it('never carries an Ad badge', () => {
    expect(renderToStaticMarkup(<ListingCard listing={event} />)).not.toMatch(
      />Ad</,
    );
  });
});
