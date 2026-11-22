import type { Listing } from './types';

export interface Placement {
  take: (list: Listing[], limit?: number) => Listing[];
  placed: () => Listing[];
}

export function placement(start: Listing[] = []): Placement {
  const ids = new Set(start.map((l) => l.id));
  const placed = [...start];
  return {
    take(list, limit = Infinity) {
      const kept = list.filter((l) => !ids.has(l.id)).slice(0, limit);
      for (const l of kept) {
        ids.add(l.id);
        placed.push(l);
      }
      return kept;
    },
    placed: () => [...placed],
  };
}
