import { adoptReaderCity, taxonomy } from './api';
import { interestsStore, readerLinkStore } from './preferences';
import { searchHref } from './router';
import { slugify } from './text';

export const READER_INTERESTS_PARAM = 'for';
export const READER_CITY_PARAM = 'in';
const INTEREST_SEPARATOR = ',';
const LONGEST_CITY = 64;
const CONTROL_CHARACTERS = /\p{Cc}/gu;

export interface ReaderLink {
  interests: string[];
  city: string;
}

function interestLabelOf(slug: string): string | undefined {
  const { event, opportunity } = taxonomy().onboardingInterests;
  return [...event, ...opportunity].find((label) => slugify(label) === slug);
}

export function readerLinkOf(search: string): ReaderLink | null {
  const params = new URLSearchParams(search);
  const slugs = (params.get(READER_INTERESTS_PARAM) ?? '')
    .split(INTEREST_SEPARATOR)
    .map((slug) => slug.trim().toLowerCase());
  const interests = [
    ...new Set(slugs.map(interestLabelOf).filter((l) => l !== undefined)),
  ];
  const city = cityOf(params.get(READER_CITY_PARAM) ?? '');
  if (!interests.length && !city) return null;
  return { interests, city };
}

function cityOf(raw: string): string {
  const city = raw.replace(CONTROL_CHARACTERS, '').trim();
  return city.length <= LONGEST_CITY ? city : '';
}

export function withoutReaderLink(location: string, link: ReaderLink): string {
  return searchHref(location, {
    [READER_CITY_PARAM]: null,
    ...(link.interests.length ? { [READER_INTERESTS_PARAM]: null } : {}),
  });
}

export function adoptReaderLink(): void {
  const { pathname, search, hash } = window.location;
  const link = readerLinkOf(search);
  if (!link) return;
  if (link.interests.length) interestsStore.set(link.interests);
  if (link.city) adoptReaderCity(link.city);
  readerLinkStore.set(true);
  window.history.replaceState(
    window.history.state,
    '',
    withoutReaderLink(pathname + search, link) + hash,
  );
}
