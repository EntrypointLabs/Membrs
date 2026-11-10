/**
 * The shapes membrs reads. They mirror the fixtures in src/fixtures and are
 * the contract a real API has to meet when VITE_API_BASE is set.
 */

/** A day of the month as listings print it: "Sat 7 Nov". */
export interface DayLabel {
  weekday: string;
  day: number;
  month: string;
}

interface ListingBase {
  id: string;
  title: string;
  category: string;
  city: string;
  organiser: string;
  /** Where the listing was found, shown as "Listed on …". */
  source: string;
  url: string;
  trending: boolean;
  blurb: string;
  /** Lower ranks were listed first. Ties break on what happens soonest. */
  listedRank: number;
  /** A stock photo id from assets/photos, always present. */
  photo: string;
  /** The organiser's own cover image. Shown first; the stock photo stands in if it fails. */
  photoUrl?: string;
  /** The longer description, one string per paragraph. Falls back to the blurb. */
  about?: string[];
}

export interface EventListing extends ListingBase {
  kind: 'event';
  area: string;
  venue: string;
  date: DayLabel;
  time: string;
  price: string;
  free: boolean;
  mode: 'In person' | 'Remote';
  /** Whole days from the reference date. 0 is tonight. */
  inDays: number;
  host: string;
  startsAt: string | null;
  endsAt: string | null;
}

export interface OpportunityListing extends ListingBase {
  kind: 'opportunity';
  deadline: DayLabel & { label: string };
  daysLeft: number;
  award: string;
  level: string | null;
  remote: boolean;
  mode: 'In person' | 'Remote';
  eligibility: string[];
  /** The field it belongs to (Technology, Climate…), shown as a second tag. */
  sector?: string;
}

export type Listing = EventListing | OpportunityListing;
export type ListingKind = Listing['kind'];

/** Opening hours as decimal hours: 8.5 is 8:30 AM. */
export interface OpeningHours {
  opens: number;
  closes: number;
}

export interface Place {
  id: string;
  name: string;
  type: string;
  city: string;
  area: string;
  entry: string;
  /** Monday first. null is closed all day. */
  hours: (OpeningHours | null)[];
  goodFor: string[];
  about: string;
  photo: string;
}

export interface Promo {
  id: string;
  title: string;
  merchant: string;
  category: string;
  city: string;
  where: string;
  offer: string;
  code: string | null;
  endsInDays: number;
  startsInDays: number;
  host: string;
  photo: string;
  blurb: string;
  steps: string[];
  finePrint: string[];
}

export interface Category {
  name: string;
  kind: ListingKind | 'place';
  slug: string;
  count: number;
  blurb: string;
  photo: string;
}

export interface LegalSection {
  heading: string;
  /** Plain text with <b> and <a href> only. Rendered by RichText. */
  paragraphs: string[];
}

export interface LegalDocument {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export type LegalSlug =
  'terms' | 'privacy' | 'cookies' | 'guidelines' | 'advertising';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'time' | 'url' | 'textarea' | 'email';
  options?: string[];
  placeholder?: string;
  required: boolean;
}

export interface ContributeForm {
  title: string;
  lead: string;
  fields: FormField[];
}

export type ContributeKind = 'event' | 'opportunity' | 'place' | 'promo' | 'ad';

export interface LaunchCity {
  name: string;
  status: 'live' | 'soon';
}

export interface Taxonomy {
  eventCategories: string[];
  opportunityCategories: string[];
  placeTypes: string[];
  placeTypeBlurbs: Record<string, string>;
  promoCategories: string[];
  placeGroups: { slug: string; label: string }[];
  onboardingInterests: {
    event: string[];
    opportunity: string[];
    place: string[];
  };
}
