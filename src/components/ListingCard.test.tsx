import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { feed, listingById } from '../lib/api';
import type { OpportunityListing } from '../lib/types';
import { ListingCard } from './ListingCard';

describe('ListingCard', () => {
  const event = feed('event')[0]!;
  const opportunity = listingById('o1') as OpportunityListing;

  it('links to the listing and shows its price', () => {
    const html = renderToStaticMarkup(<ListingCard listing={event} />);
    expect(html).toContain(`href="/listing/${event.id}"`);
    expect(html).toContain(event.title);
    expect(html).toContain(event.kind === 'event' ? event.price : '');
  });

  it('shows the deadline and award for an opportunity', () => {
    const html = renderToStaticMarkup(<ListingCard listing={opportunity} />);
    expect(html).toContain(
      `Closes ${opportunity.deadline.day} ${opportunity.deadline.month}`,
    );
    expect(html).toContain(opportunity.award);
  });

  it('never carries an Ad badge', () => {
    expect(renderToStaticMarkup(<ListingCard listing={event} />)).not.toMatch(
      />Ad</,
    );
  });
});
