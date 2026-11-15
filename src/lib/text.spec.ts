import { describe, expect, it } from 'vitest';
import {
  daysLeftLine,
  distinctParts,
  plural,
  priceText,
  slugify,
  sourceName,
  titleCase,
} from './text';

describe('titleCase', () => {
  it('follows NYT style', () => {
    expect(titleCase('get the best of lagos in your inbox every sunday.')).toBe(
      'Get the Best of Lagos in Your Inbox Every Sunday.',
    );
  });

  it('capitalises a minor word at either end', () => {
    expect(titleCase('the place to be in')).toBe('The Place to Be In');
  });

  it('leaves acronyms and brand casing alone', () => {
    expect(titleCase('opera at MUSON with DevFest')).toBe(
      'Opera at MUSON With DevFest',
    );
  });
});

describe('slugify', () => {
  it('turns names into paths', () => {
    expect(slugify('Art & Design')).toBe('art-design');
    expect(slugify('Calls for Speakers')).toBe('calls-for-speakers');
  });
});

describe('plural', () => {
  it('counts', () => {
    expect(plural(1, 'event')).toBe('1 event');
    expect(plural(1200, 'place')).toBe('1,200 places');
  });
});

describe('daysLeftLine', () => {
  it('says closes today instead of 0 days left', () => {
    expect(daysLeftLine(0)).toBe('Closes today');
  });

  it('keeps one day singular', () => {
    expect(daysLeftLine(1)).toBe('1 day left');
  });

  it('pluralises the rest', () => {
    expect(daysLeftLine(12)).toBe('12 days left');
  });
});

describe('sourceName', () => {
  it('spells known sources the way they spell themselves', () => {
    expect(sourceName('eventbrite')).toBe('Eventbrite');
    expect(sourceName('membrs')).toBe('MEMBRS');
  });

  it('capitalises unknown lower case sources and leaves the rest', () => {
    expect(sourceName('ticketsng')).toBe('Ticketsng');
    expect(sourceName('Devpost')).toBe('Devpost');
  });
});

describe('priceText', () => {
  it('shows two decimals where a price has one', () => {
    expect(priceText('£4.5')).toBe('£4.50');
    expect(priceText('Up to $1,200.5 a month')).toBe('Up to $1,200.50 a month');
  });

  it('leaves whole and two decimal prices alone', () => {
    expect(priceText('₦15,000')).toBe('₦15,000');
    expect(priceText('€9.99')).toBe('€9.99');
    expect(priceText('Free')).toBe('Free');
  });
});

describe('distinctParts', () => {
  it('drops parts the venue line already says', () => {
    expect(
      distinctParts('Eko Hotel, Victoria Island, Lagos', [
        'Victoria Island',
        'Lagos',
      ]),
    ).toEqual([]);
  });

  it('drops a city the area already names', () => {
    expect(
      distinctParts('Muson Centre', ['8 Marina, Lagos Island', 'Lagos']),
    ).toEqual(['8 Marina, Lagos Island']);
  });

  it('keeps what is new', () => {
    expect(distinctParts('Muson Centre', ['Onikan', 'Lagos'])).toEqual([
      'Onikan',
      'Lagos',
    ]);
  });
});
