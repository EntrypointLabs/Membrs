import { naira } from './ads';
import { WEEKDAYS } from './dates';
import photos from '../generated/photos.json';
import type { Listing, OpeningHours, Place, Promo } from './types';

export interface RemoteEstablishment {
  id: string;
  name: string;
  kind: string;
  categories: string[] | null;
  tags: string[] | null;
  description: string;
  address: string;
  city: string;
  websiteUrl: string;
  openingHours:
    | (Partial<
        Record<
          'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun',
          OpeningHours
        >
      > & {
        weekdayDescriptions?: string[];
      })
    | null;
  amenities: string[] | null;
}

type Decimal = string | number | null;

export interface RemoteDeal {
  id: string;
  title: string;
  description: string;
  discount: {
    kind: string;
    percent: Decimal;
    amount: Decimal;
    currency: string;
  };
  code: string;
  city: string;
  establishmentId: string | null;
  startsAt: string | null;
  endsAt: string | null;
}

export interface RemoteInterestPick {
  kind: 'event' | 'opportunity' | 'place';
  category: string;
}

export interface RemoteNewsletter {
  subscribed: boolean;
  frequency: string;
  city: string | null;
  interests: string[];
}

const PLACE_TYPES: Record<string, string> = {
  gallery: 'Museums & galleries',
  outdoor: 'Parks & gardens',
};

export function placeTypeOf(kind: string): string {
  return (
    PLACE_TYPES[kind] ?? (kind ? kind[0]!.toUpperCase() + kind.slice(1) : '')
  );
}

const DAY_NAMES = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const CLOCK = /(\d{1,2})(?::(\d{2}))?\s*([AP]M)?/gi;

function spanOf(text: string): OpeningHours | null {
  if (/24\s*hours/i.test(text)) return { opens: 0, closes: 24 };
  const times = [...text.matchAll(CLOCK)].map((m) => ({
    hour: Number(m[1]) + Number(m[2] ?? 0) / 60,
    half: m[3]?.toUpperCase(),
  }));
  if (times.length < 2) return null;
  const first = times[0]!;
  const last = times.at(-1)!;
  const toDecimal = (t: { hour: number; half?: string }, half?: string) => {
    const h = t.hour % 12;
    return (t.half ?? half) === 'PM' ? h + 12 : h;
  };
  const opens = toDecimal(first, times.find((t) => t.half)?.half);
  let closes = toDecimal(last, last.half ?? first.half);
  if (closes <= opens) closes += 24;
  return { opens, closes };
}

export function hoursOf(
  hours: RemoteEstablishment['openingHours'],
): (OpeningHours | null)[] {
  const week: (OpeningHours | null)[] = WEEKDAYS.map((day) => {
    const span = hours?.[day as keyof typeof hours] as OpeningHours | undefined;
    return span && typeof span.opens === 'number' ? span : null;
  });
  for (const line of hours?.weekdayDescriptions ?? []) {
    const [day = '', ...rest] = line.split(':');
    const index = DAY_NAMES.indexOf(day.trim().toLowerCase());
    if (index >= 0) week[index] = spanOf(rest.join(':'));
  }
  return week;
}

export function isPlace(row: RemoteEstablishment): boolean {
  return hoursOf(row.openingHours).some(Boolean);
}

export function placeOf(
  row: RemoteEstablishment,
  photoFor: (type: string) => string,
): Place {
  const type = placeTypeOf(row.kind);
  return {
    id: row.id,
    name: row.name,
    type,
    city: row.city,
    area: row.address.split(',')[0]?.trim() || row.city,
    entry: '',
    hours: hoursOf(row.openingHours),
    goodFor: [...(row.tags ?? []), ...(row.amenities ?? [])],
    about: row.description,
    photo: photoFor(type),
  };
}

function amount(value: Decimal): number | null {
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function offerOf(deal: RemoteDeal): string {
  const { kind, currency } = deal.discount;
  const percent = amount(deal.discount.percent);
  const off = amount(deal.discount.amount);
  if (kind === 'percentOff' && percent !== null) return `${percent}% off`;
  if (kind === 'amountOff' && off !== null)
    return currency && currency !== 'NGN'
      ? `${currency} ${off.toLocaleString('en-NG')} off`
      : `${naira(off)} off`;
  if (kind === 'freebie') return 'Freebie';
  if (kind === 'happyHour') return 'Happy hour';
  return deal.title;
}

const DAY_MS = 86_400_000;

export function daysUntil(iso: string, now: Date): number {
  const start = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((start(new Date(iso)) - start(now)) / DAY_MS);
}

const OPEN_ENDED_DAYS = 365;

function hostOf(url: string | undefined): string {
  try {
    return url ? new URL(url).host : '';
  } catch {
    return '';
  }
}

const lines = (block = '') =>
  block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

function sectionsOf(description: string) {
  const [blurb = '', steps, ...finePrint] = description.split(/\n\s*\n/);
  return {
    blurb: blurb.trim(),
    steps: lines(steps),
    finePrint: finePrint.flatMap((block) => lines(block)),
  };
}

export function promoOf(
  deal: RemoteDeal,
  merchant: RemoteEstablishment | undefined,
  photo: string,
  now: Date,
): Promo {
  const city = deal.city || merchant?.city || 'Online';
  return {
    id: deal.id,
    title: deal.title,
    merchant: merchant?.name ?? deal.title,
    category: '',
    city,
    where: merchant?.address || city,
    offer: offerOf(deal),
    code: deal.code || null,
    endsInDays: deal.endsAt ? daysUntil(deal.endsAt, now) : OPEN_ENDED_DAYS,
    startsInDays: deal.startsAt
      ? Math.max(0, daysUntil(deal.startsAt, now))
      : 0,
    host: hostOf(merchant?.websiteUrl),
    photo,
    ...sectionsOf(deal.description),
  };
}

const STOCK_PHOTOS = new Set(Object.keys(photos));

export function withSourcePhoto(listing: Listing): Listing {
  if (STOCK_PHOTOS.has(listing.photo)) return listing;
  const source = /^https?:\/\//.test(listing.photo) ? listing.photo : '';
  return {
    ...listing,
    photo: '',
    photoUrl: listing.photoUrl || source || undefined,
  };
}
