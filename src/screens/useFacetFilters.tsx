import { FacetSelect } from '../components/FacetSelect';
import { setSearchParams, useSearchParams } from '../lib/router';
import type { FacetMenu } from '../lib/types';

const FACET_PARAMS = new Set([
  'listing',
  'type',
  'state',
  'view',
  'mode',
  'budget',
  'topic',
  'region',
  'country',
  'source',
  'deadline',
  'reward',
  'funding',
  'level',
  'for',
]);

const LEGACY_PARAMS: Record<string, string> = { city: 'state' };

export function facetPicksOf(query: URLSearchParams): Record<string, string> {
  const picks: Record<string, string> = {};
  for (const [param, value] of query) {
    if (value && FACET_PARAMS.has(param)) picks[param] = value;
  }
  return { ...legacyPicksOf(query, picks), ...picks };
}

function legacyPicksOf(
  query: URLSearchParams,
  picks: Record<string, string>,
): Record<string, string> {
  const carried: Record<string, string> = {};
  for (const [legacy, facet] of Object.entries(LEGACY_PARAMS)) {
    const value = query.get(legacy);
    if (value && !picks[facet]) carried[facet] = value;
  }
  return carried;
}

function withLegacyMoved(
  query: URLSearchParams,
): Record<string, string | null> {
  const moved: Record<string, string | null> = {};
  for (const [legacy, facet] of Object.entries(LEGACY_PARAMS)) {
    const value = query.get(legacy);
    if (value === null) continue;
    moved[legacy] = null;
    if (value && !query.get(facet)) moved[facet] = value;
  }
  return moved;
}

export function useFacetFilters(
  menus: FacetMenu[] | undefined,
  onTheLine: ReadonlySet<string>,
) {
  const query = useSearchParams();
  const picks = facetPicksOf(query);
  const facets = menus ?? [];
  const pick = (param: string, value: string | null) =>
    setSearchParams({ ...withLegacyMoved(query), [param]: value, page: null });
  const control = (facet: FacetMenu, chip: boolean) => (
    <FacetSelect
      key={facet.param}
      label={facet.label}
      value={facet.picked}
      options={facet.options}
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
    facets,
    menu: (facet: FacetMenu) => control(facet, false),
    chip: (facet: FacetMenu) => control(facet, true),
    active: facets.filter((f) => f.picked),
    requested: Object.keys(picks).length > 0,
    lineFacets: facets.filter((f) => onTheLine.has(f.param)),
    panelFacets,
    panelActive: panelFacets.filter((f) => f.picked).length,
    cleared: Object.fromEntries(
      [
        ...Object.keys(picks),
        ...Object.keys(LEGACY_PARAMS),
        ...facets.map((f) => f.param),
      ].map((p) => [p, null]),
    ),
  };
}
