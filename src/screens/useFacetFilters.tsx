import { FacetSelect } from '../components/FacetSelect';
import {
  type Facet,
  filtered,
  knownPicks,
  optionsOf,
  type Picks,
} from '../lib/filters';
import { setSearchParams, useSearchParams } from '../lib/router';
import type { Listing } from '../lib/types';

export function useFacetFilters(
  all: Listing[],
  facets: Facet[],
  onTheLine: ReadonlySet<string>,
) {
  const query = useSearchParams();
  const picks: Picks = knownPicks(
    all,
    facets,
    Object.fromEntries(facets.map((f) => [f.param, query.get(f.param)])),
  );
  const pick = (param: string, value: string | null) =>
    setSearchParams({ [param]: value, page: null });
  const control = (facet: Facet, chip: boolean) => (
    <FacetSelect
      key={facet.param}
      label={facet.label}
      value={picks[facet.param] ?? null}
      options={optionsOf(facet, all, facets, picks)}
      onChange={(v) => pick(facet.param, v)}
      anyLabel={onTheLine.has(facet.param) ? 'All' : 'Any'}
      chip={chip}
    />
  );
  const panelFacets = facets.filter((f) => !onTheLine.has(f.param));
  return {
    query,
    picks,
    pick,
    menu: (facet: Facet) => control(facet, false),
    chip: (facet: Facet) => control(facet, true),
    items: filtered(all, facets, picks),
    active: facets.filter((f) => picks[f.param]),
    lineFacets: facets.filter((f) => onTheLine.has(f.param)),
    panelFacets,
    panelActive: panelFacets.filter((f) => picks[f.param]).length,
    cleared: Object.fromEntries(facets.map((f) => [f.param, null])),
  };
}
