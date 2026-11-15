import { describe, expect, it } from 'vitest';
import listingsFixture from '../fixtures/listings.json';
import type { Listing } from './types';
import {
  daysUntil,
  hoursOf,
  isPlace,
  offerOf,
  placeOf,
  promoOf,
  withSourcePhoto,
  type RemoteDeal,
  type RemoteEstablishment,
} from './remote';

const venue: RemoteEstablishment = {
  id: 'e1',
  name: 'Nike Art Gallery',
  kind: 'gallery',
  categories: ['arts'],
  tags: ['Art'],
  description: 'Five floors of Nigerian art.',
  address: 'Lekki, Lagos',
  city: 'Lagos',
  websiteUrl: 'https://nikeart.com/visit',
  openingHours: {
    weekdayDescriptions: [
      'Monday: 9:00 AM – 5:00 PM',
      'Tuesday: Closed',
      'Wednesday: Open 24 hours',
      'Thursday: 6:00 – 10:00 PM',
      'Friday: 6:00 PM – 2:00 AM',
    ],
  },
  amenities: ['Parking'],
};

const deal: RemoteDeal = {
  id: 'd1',
  title: 'Weekday entry',
  description:
    'Half off on weekdays.\n\nShow the code\nPay at the gate\n\nWeekdays only\nOne per person',
  discount: { kind: 'percentOff', percent: '50', amount: null, currency: '' },
  code: '',
  city: '',
  establishmentId: 'e1',
  startsAt: '2026-11-12T10:00:00Z',
  endsAt: '2026-11-20T10:00:00Z',
};

describe('hoursOf', () => {
  it('reads Google weekday descriptions into Monday-first decimal hours', () => {
    expect(hoursOf(venue.openingHours)).toEqual([
      { opens: 9, closes: 17 },
      null,
      { opens: 0, closes: 24 },
      { opens: 18, closes: 22 },
      { opens: 18, closes: 26 },
      null,
      null,
    ]);
  });

  it('reads the API day map', () => {
    expect(
      hoursOf({
        Mon: { opens: 8, closes: 18 },
        Sat: { opens: 10, closes: 2 },
      }),
    ).toEqual([
      { opens: 8, closes: 18 },
      null,
      null,
      null,
      null,
      { opens: 10, closes: 2 },
      null,
    ]);
  });

  it('gives seven unknown days when there are no hours', () => {
    expect(hoursOf(null)).toEqual([null, null, null, null, null, null, null]);
  });
});

describe('isPlace', () => {
  it('keeps establishments with opening hours and drops bare venues', () => {
    expect(isPlace(venue)).toBe(true);
    expect(isPlace({ ...venue, kind: 'hall', openingHours: {} })).toBe(false);
    expect(isPlace({ ...venue, openingHours: null })).toBe(false);
  });
});

describe('placeOf', () => {
  it('maps an establishment onto the Place shape', () => {
    const place = placeOf(venue, () => 'q31');
    expect(place).toMatchObject({
      id: 'e1',
      type: 'Museums & galleries',
      area: 'Lekki',
      goodFor: ['Art', 'Parking'],
      about: 'Five floors of Nigerian art.',
      photo: 'q31',
    });
    expect(place.hours).toHaveLength(7);
  });
});

describe('promoOf', () => {
  it('labels discounts', () => {
    expect(offerOf(deal)).toBe('50% off');
    expect(
      offerOf({
        ...deal,
        discount: {
          kind: 'amountOff',
          percent: null,
          amount: 2000,
          currency: 'NGN',
        },
      }),
    ).toBe('₦2,000 off');
    expect(
      offerOf({ ...deal, discount: { ...deal.discount, kind: 'freebie' } }),
    ).toBe('Freebie');
  });

  it('counts days from now and borrows the merchant from the establishment', () => {
    const now = new Date('2026-11-11T12:00:00Z');
    expect(daysUntil('2026-11-20T10:00:00Z', now)).toBe(9);
    expect(promoOf(deal, venue, 'p10', now)).toMatchObject({
      merchant: 'Nike Art Gallery',
      city: 'Lagos',
      offer: '50% off',
      code: null,
      endsInDays: 9,
      startsInDays: 1,
      host: 'nikeart.com',
      photo: 'p10',
      blurb: 'Half off on weekdays.',
      steps: ['Show the code', 'Pay at the gate'],
      finePrint: ['Weekdays only', 'One per person'],
    });
  });
});

describe('withSourcePhoto', () => {
  const stock = listingsFixture[0] as Listing;

  it('keeps a fixture listing that names its own photo', () => {
    expect(withSourcePhoto(stock)).toBe(stock);
  });

  it('shows only the source image, never a stand-in photo', () => {
    const live = { ...stock, photo: 'https://cdn.example.com/cover.jpg' };
    expect(withSourcePhoto(live)).toMatchObject({
      photo: '',
      photoUrl: 'https://cdn.example.com/cover.jpg',
    });
  });

  it('leaves a listing with no source image without a photo', () => {
    const mapped = withSourcePhoto({
      ...stock,
      photo: '',
      photoUrl: undefined,
    });
    expect(mapped.photo).toBe('');
    expect(mapped.photoUrl).toBeUndefined();
  });
});
