import { describe, expect, it } from 'vitest';
import {
  isWebLink,
  localIsoDate,
  photoProblem,
  withScheme,
  PHOTO_MAX_BYTES,
} from './contribute';

const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

describe('withScheme', () => {
  it('adds https to a bare web address', () => {
    expect(withScheme('www.example.com')).toBe('https://www.example.com');
    expect(withScheme(' lu.ma/devfest?x=1 ')).toBe('https://lu.ma/devfest?x=1');
  });

  it('leaves full links and non-links alone', () => {
    expect(withScheme('http://example.com')).toBe('http://example.com');
    expect(withScheme('mailto:a@b.co')).toBe('mailto:a@b.co');
    expect(withScheme('not a link')).toBe('not a link');
    expect(withScheme('')).toBe('');
  });

  it('produces links the validator accepts', () => {
    expect(isWebLink(withScheme('example.com'))).toBe(true);
    expect(isWebLink('ftp://example.com')).toBe(false);
  });
});

describe('localIsoDate', () => {
  it('uses the local calendar day', () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('photoProblem', () => {
  const ok = { type: 'image/jpeg', size: 1000, width: 1600, height: 1200 };

  it('accepts a JPG, PNG or WebP under the size limit', () => {
    expect(photoProblem(ok, TYPES)).toBeNull();
    expect(photoProblem({ ...ok, type: 'image/webp' }, TYPES)).toBeNull();
  });

  it('refuses other types, oversize files and unreadable images', () => {
    expect(photoProblem({ ...ok, type: 'image/gif' }, TYPES)).toMatch(
      /JPG, PNG or WebP/,
    );
    expect(photoProblem({ ...ok, size: PHOTO_MAX_BYTES + 1 }, TYPES)).toMatch(
      /10 MB/,
    );
    expect(photoProblem({ ...ok, width: 0 }, TYPES)).toMatch(/Could not open/);
  });

  it('accepts any size or shape of photo', () => {
    expect(photoProblem({ ...ok, width: 400, height: 900 }, TYPES)).toBeNull();
    expect(
      photoProblem({ ...ok, width: 1920, height: 1080 }, TYPES),
    ).toBeNull();
  });
});
