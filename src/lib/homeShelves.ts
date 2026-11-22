import { alternated, similar } from './api';
import { africanCountry, type ReaderPlace } from './africa';
import { byPopularity, isComingSoon, isThisWeekend } from './dates';
import { PAGE_SIZE } from './config';
import { distinctFamilies } from './families';
import { countryName } from './filters';
import { closestTo, type Position } from './geo';
import { AROUND_KM, type NearbyPlace } from './location';
import type { EventListing, Listing, OpportunityListing } from './types';

export interface HomeShelf {
  id: string;
  title: string;
  about?: string;
  items: Listing[];
  /** The fewest listings the shelf needs to show, when it is not MIN_SHELF. */
  minimum?: number;
  /** How many listings the shelf may keep, when it is not the usual SHELF_SIZE. */
  limit?: number;
  /** How far each listing is from the reader, by id, when their position is known. */
  distances?: ReadonlyMap<string, number>;
}

export interface ShelfInputs {
  pool: Listing[];
  nearby: NearbyPlace | null;
  /** The state and country the reader picked, used when their position is not shared. */
  picked?: ReaderPlace;
  position?: Position | null;
  viewed: readonly string[];
  shown?: Listing[];
}

export const SHELF_SIZE = PAGE_SIZE * 2;
const NEAR_YOU_SIZE = SHELF_SIZE * 4;
const MIN_SHELF = 4;
export const CONCERT_CATEGORY = 'Music';
const SCHOLARSHIP_CATEGORY = 'Scholarships';
const FULLY_FUNDED = /fully funded/i;

function isEvent(listing: Listing): listing is EventListing {
  return listing.kind === 'event';
}

function isOpportunity(listing: Listing): listing is OpportunityListing {
  return listing.kind === 'opportunity';
}

export function isRemoteOpportunity(listing: Listing): boolean {
  return (
    isOpportunity(listing) && (listing.remote || listing.mode === 'Remote')
  );
}

export function isOnlineEvent(listing: Listing): boolean {
  return isEvent(listing) && listing.mode === 'Remote';
}

function bothKinds(listings: Listing[]): Listing[] {
  return alternated<Listing>(
    listings.filter(isEvent),
    listings.filter(isOpportunity),
  );
}

function nearYou(
  placed: Listing[],
  place: NearbyPlace,
  position: Position | null,
): HomeShelf {
  const shelf = {
    id: 'nearby',
    title: 'Near You',
    about: place.city,
    limit: NEAR_YOU_SIZE,
  };
  if (position) {
    const closest = closestTo(position, placed, AROUND_KM);
    return {
      ...shelf,
      items: closest.map((d) => d.listing),
      distances: new Map(closest.map((d) => [d.listing.id, d.km])),
    };
  }
  const around = new Set([place.city, ...place.around]);
  const near = placed.filter((l) => around.has(l.city));
  return {
    ...shelf,
    items: bothKinds(near),
  };
}

/**
 * Near You for a reader who picked a place rather than sharing a position:
 * their state first, then the rest of their country, then events anyone can
 * join online.
 */
function pickedNearYou(upcoming: Listing[], picked: ReaderPlace): HomeShelf {
  const inPerson = upcoming.filter(
    (l) =>
      !isOnlineEvent(l) &&
      !isRemoteOpportunity(l) &&
      l.country === picked.country,
  );
  const inState = (l: Listing) =>
    picked.state !== '' && l.state === picked.state;
  return {
    id: 'nearby',
    title: 'Near You',
    about: picked.state || africanCountry(picked.country)?.name,
    limit: NEAR_YOU_SIZE,
    items: [
      ...bothKinds(inPerson.filter(inState)),
      ...bothKinds(inPerson.filter((l) => !inState(l))),
      ...upcoming.filter(isOnlineEvent),
    ],
  };
}

function nearbyPlans(
  upcoming: Listing[],
  place: NearbyPlace | null,
  position: Position | null,
  picked?: ReaderPlace,
): HomeShelf[] {
  if (!place) return picked?.country ? [pickedNearYou(upcoming, picked)] : [];
  const placed = upcoming.filter((l) => !isRemoteOpportunity(l));
  const country = placed.filter(
    (l) => place.country !== '' && l.country === place.country,
  );
  return [
    nearYou(placed, place, position),
    {
      id: 'country',
      title: `In ${countryName(place.country)}`,
      items: bothKinds(country),
    },
  ];
}

function viewedPlans(
  pool: Listing[],
  upcoming: Listing[],
  viewed: readonly string[],
): HomeShelf[] {
  const latest = viewed
    .map((id) => pool.find((l) => l.id === id))
    .find((seen) => seen !== undefined);
  if (!latest) return [];
  return [
    {
      id: `viewed:${latest.id}`,
      title: 'Because You Viewed',
      about: latest.title,
      minimum: 1,
      items: similar(latest, SHELF_SIZE * 2, upcoming).sort(byPopularity),
    },
  ];
}

function categoryPlans(
  upcoming: Listing[],
  kind: Listing['kind'],
): HomeShelf[] {
  const counts = new Map<string, number>();
  for (const l of upcoming) {
    if (l.kind === kind && l.category && l.category !== CONCERT_CATEGORY)
      counts.set(l.category, (counts.get(l.category) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => ({
      id: `${kind}:${category}`,
      title: kind === 'event' ? `${category} This Month` : category,
      items: upcoming.filter((l) => l.kind === kind && l.category === category),
    }));
}

function plansFor({ pool, viewed }: ShelfInputs): HomeShelf[] {
  const upcoming = pool.filter(isComingSoon).sort(byPopularity);
  return [
    ...viewedPlans(pool, upcoming, viewed),
    {
      id: 'online',
      title: 'Online Events',
      items: upcoming.filter(isOnlineEvent),
    },
    {
      id: 'remote',
      title: 'Remote Opportunities',
      items: upcoming.filter(isRemoteOpportunity),
    },
    {
      id: 'concerts',
      title: 'Concerts This Month',
      items: upcoming.filter(
        (l) => isEvent(l) && l.category === CONCERT_CATEGORY,
      ),
    },
    {
      id: 'free-weekend',
      title: 'Free This Weekend',
      items: upcoming.filter((l) => isEvent(l) && l.free && isThisWeekend(l)),
    },
    {
      id: 'fully-funded',
      title: 'Fully Funded Scholarships',
      items: upcoming.filter(
        (l) =>
          isOpportunity(l) &&
          l.category === SCHOLARSHIP_CATEGORY &&
          FULLY_FUNDED.test(l.funding ?? ''),
      ),
    },
    ...categoryPlans(upcoming, 'event'),
    ...categoryPlans(upcoming, 'opportunity'),
  ];
}

function filled(plans: HomeShelf[], shown: Listing[] = []): HomeShelf[] {
  const placed = [...shown];
  const placedIds = new Set(placed.map((l) => l.id));
  const shelves: HomeShelf[] = [];
  for (const plan of plans) {
    const fresh = distinctFamilies(
      plan.items.filter((l) => !placedIds.has(l.id)),
      placed,
      plan.limit ?? SHELF_SIZE,
    );
    if (fresh.length < (plan.minimum ?? MIN_SHELF)) continue;
    placed.push(...fresh);
    for (const l of fresh) placedIds.add(l.id);
    shelves.push({ ...plan, items: fresh });
  }
  return shelves;
}

function sameList<T>(first: readonly T[], second: readonly T[]): boolean {
  return (
    first.length === second.length && first.every((x, i) => x === second[i])
  );
}

function sameInputs(first: ShelfInputs, second: ShelfInputs): boolean {
  return (
    first.nearby === second.nearby &&
    first.picked?.country === second.picked?.country &&
    first.picked?.state === second.picked?.state &&
    (first.position ?? null) === (second.position ?? null) &&
    sameList(first.viewed, second.viewed) &&
    sameList(first.shown ?? [], second.shown ?? []) &&
    sameList(first.pool, second.pool)
  );
}

function lastCall(
  build: (inputs: ShelfInputs) => HomeShelf[],
): (inputs: ShelfInputs) => HomeShelf[] {
  let last: { inputs: ShelfInputs; shelves: HomeShelf[] } | null = null;
  return (inputs) => {
    if (last && sameInputs(last.inputs, inputs)) return last.shelves;
    const shelves = build(inputs);
    last = { inputs, shelves };
    return shelves;
  };
}

export const localShelves = lastCall((inputs) => {
  const upcoming = inputs.pool.filter(isComingSoon).sort(byPopularity);
  return filled(
    nearbyPlans(
      upcoming,
      inputs.nearby,
      inputs.position ?? null,
      inputs.picked,
    ),
    inputs.shown,
  );
});

export const homeShelves = lastCall((inputs) =>
  filled(plansFor(inputs), inputs.shown),
);
