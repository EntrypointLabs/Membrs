import { describe, expect, it } from 'vitest';
import { plural, slugify, titleCase } from './text';

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
