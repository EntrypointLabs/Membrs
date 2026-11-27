import { readerCountryStore, type HomeParams } from './api';
import { readerPlaceOf } from './africa';
import { nearbyStore, type NearbyPlace } from './location';
import { cityStore } from './preferences';
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
    ...(phone || !tabs
      ? {}
      : { popular: tabs.popular, range: tabs.range, weekKind: tabs.weekKind }),
  };
}

export function readerNow(): Reader {
  return {
    city: cityStore.get(),
    country: readerCountryStore.get(),
    nearby: nearbyStore.get(),
    viewed: viewedStore.get(),
  };
}
