import { FacetSelect } from '../components/FacetSelect';
import { setSearchParams, useSearchParams } from '../lib/router';
import type { FacetMenu } from '../lib/types';

const NOT_FACETS = new Set(['sort', 'page', 'q']);

export function useFacetFilters(
  menus: FacetMenu[] | undefined,
  onTheLine: ReadonlySet<string>,
) {
  const query = useSearchParams();
  const picks = Object.fromEntries(
    [...query.keys()]
      .filter((p) => !NOT_FACETS.has(p))
      .map((p) => [p, query.get(p)]),
  );
  const facets = menus ?? [];
  const pick = (param: string, value: string | null) =>
    setSearchParams({ [param]: value, page: null });
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
      [...Object.keys(picks), ...facets.map((f) => f.param)].map((p) => [
        p,
        null,
      ]),
    ),
  };
}
