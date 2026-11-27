import { interestPicks, readerCountryStore, type HomeParams } from './api';
import { readerPlaceOf } from './africa';
import { nearbyStore, type NearbyPlace } from './location';
import {
  cityStore,
  interestsStore,
  readerLinkStore,
  subscriptionStore,
} from './preferences';
import { useStore } from './store';
import type { ListingKind } from './types';
import { viewedStore } from './viewed';

type KindFilter = 'all' | ListingKind;

const VIEWED_SENT = 3;

export interface HomeTabs {
  popular: KindFilter;
  range: 'week' | 'month';
  weekKind: KindFilter;
}

export interface Reader {
  city: string;
  country: string;
  nearby: NearbyPlace | null;
  viewed: unknown;
  interests: string[];
}

function interestParamOf(labels: string[]): string[] {
  return interestPicks(labels)
    .filter((p) => p.kind === 'event' || p.kind === 'opportunity')
    .map((p) => `${p.kind}:${p.category}`);
}

export function homeParamsOf(
  phone: boolean,
  reader: Reader,
  tabs?: HomeTabs,
): HomeParams {
  return {
    layout: phone ? 'phone' : 'web',
    country: reader.country,
    state: readerPlaceOf(reader.city, reader.country).state,
    near: reader.nearby?.city,
    around: reader.nearby?.around,
    viewed: Array.isArray(reader.viewed)
      ? reader.viewed.slice(0, VIEWED_SENT)
      : [],
    interests: interestParamOf(reader.interests),
    ...(phone || !tabs
      ? {}
      : { popular: tabs.popular, range: tabs.range, weekKind: tabs.weekKind }),
  };
}

function personalInterests(
  subscribed: boolean,
  linked: boolean,
  interests: string[],
): string[] {
  return subscribed || linked ? interests : [];
}

export function readerNow(): Reader {
  return {
    city: cityStore.get(),
    country: readerCountryStore.get(),
    nearby: nearbyStore.get(),
    viewed: viewedStore.get(),
    interests: personalInterests(
      subscriptionStore.get() !== null,
      readerLinkStore.get(),
      interestsStore.get(),
    ),
  };
}

export function useReader(): Reader {
  const subscribed = useStore(subscriptionStore) !== null;
  const linked = useStore(readerLinkStore);
  const interests = useStore(interestsStore);
  return {
    city: useStore(cityStore),
    country: useStore(readerCountryStore),
    nearby: useStore(nearbyStore),
    viewed: useStore(viewedStore),
    interests: personalInterests(subscribed, linked, interests),
  };
}
