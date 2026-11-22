import { describe, expect, it } from 'vitest';
import { distinctFamilies } from './families';
import { eventListing, opportunityListing } from './testing';

const titles = (list: { title: string }[]) => list.map((l) => l.title);

describe('distinctFamilies', () => {
  it('keeps one stop of a tour, the first one given', () => {
    const tour = [
      eventListing({
        id: '1',
        title: 'Tyla: The A*POP World Tour',
        city: 'Atlanta',
      }),
      eventListing({
        id: '2',
        title: 'Tyla: A*POP World Tour',
        city: 'Cape Town',
      }),
      eventListing({ id: '3', title: 'Wizkid Live', city: 'Lagos' }),
    ];
    expect(distinctFamilies(tour).map((l) => l.id)).toEqual(['1', '3']);
  });

  it('folds the same programme posted under different titles', () => {
    const posts = [
      opportunityListing({
        id: 'a',
        title: 'Obama Foundation Leaders Program',
      }),
      opportunityListing({
        id: 'b',
        title: 'Obama Foundation Leaders Africa Program 2027–2028',
      }),
      opportunityListing({
        id: 'c',
        title:
          "Obama Foundation's Leaders Program 2027/2028 for emerging leaders worldwide.",
      }),
      opportunityListing({
        id: 'd',
        title: 'Yenching Academy at Peking University 2027',
      }),
    ];
    expect(titles(distinctFamilies(posts))).toEqual([
      'Obama Foundation Leaders Program',
      'Yenching Academy at Peking University 2027',
    ]);
  });

  it('keeps different things that share a word or two', () => {
    const posts = [
      opportunityListing({ id: 'a', title: 'Data Journalism Grants' }),
      opportunityListing({ id: 'b', title: 'Fund for Women Journalists' }),
      opportunityListing({ id: 'c', title: 'Google Student Ambassador' }),
      opportunityListing({ id: 'd', title: 'Google Student Developer Club' }),
    ];
    expect(distinctFamilies(posts)).toHaveLength(4);
  });

  it('keeps the same role at two different companies apart', () => {
    const posts = [
      opportunityListing({
        id: 'a',
        title: 'Software Engineering Internship at Paystack',
      }),
      opportunityListing({
        id: 'b',
        title: 'Software Engineering Internship at Flutterwave',
      }),
      eventListing({ id: 'c', title: 'Lagos Startup Meetup November' }),
      eventListing({ id: 'd', title: 'Abuja Startup Meetup November' }),
    ];
    expect(distinctFamilies(posts)).toHaveLength(4);
  });

  it('skips what an earlier section already showed', () => {
    const shown = [
      eventListing({ id: 'x', title: 'Tyla: The A*POP World Tour' }),
    ];
    const next = [
      eventListing({ id: 'y', title: 'Tyla: The A*POP World Tour' }),
    ];
    expect(distinctFamilies(next, shown)).toEqual([]);
  });

  it('never folds an event into an opportunity', () => {
    const list = [
      eventListing({ id: 'e', title: 'Global Schools Prize Ceremony' }),
      opportunityListing({ id: 'o', title: 'Global Schools Prize Ceremony' }),
    ];
    expect(distinctFamilies(list)).toHaveLength(2);
  });

  it('stops at the limit, keeping the same first picks', () => {
    const list = [
      eventListing({ id: '1', title: 'Wizkid Live in Lagos' }),
      eventListing({ id: '2', title: 'Wizkid Live in Lagos' }),
      eventListing({ id: '3', title: 'Burna Boy Homecoming' }),
      eventListing({ id: '4', title: 'Tems Born in the Wild Tour' }),
    ];
    expect(distinctFamilies(list, [], 2)).toEqual(
      distinctFamilies(list).slice(0, 2),
    );
    expect(distinctFamilies(list, [], 2).map((l) => l.id)).toEqual(['1', '3']);
  });

  it('reads a renamed listing by its new title', () => {
    const listing = eventListing({ id: 'r', title: 'Tyla World Tour Lagos' });
    const shown = [eventListing({ id: 's', title: 'Tyla World Tour Lagos' })];
    expect(distinctFamilies([listing], shown)).toEqual([]);
    listing.title = 'Lagos Jazz Night';
    expect(distinctFamilies([listing], shown)).toEqual([listing]);
  });
});
