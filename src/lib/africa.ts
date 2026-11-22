import africaFixture from '../fixtures/africa.json';

export interface AfricanCountry {
  code: string;
  name: string;
  states: string[];
}

export interface ReaderPlace {
  /** ISO 3166 alpha-2, empty when the label named no African country. */
  country: string;
  /** A GeoNames first-level region of that country, empty for the whole country. */
  state: string;
}

export const AFRICAN_COUNTRIES: readonly AfricanCountry[] = africaFixture;

const byCode = new Map(AFRICAN_COUNTRIES.map((c) => [c.code, c]));
const byName = new Map(AFRICAN_COUNTRIES.map((c) => [fold(c.name), c]));

function fold(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function africanCountry(code: string): AfricanCountry | undefined {
  return byCode.get(code.trim().toUpperCase());
}

function countryNamed(nameOrCode: string): AfricanCountry | undefined {
  return byName.get(fold(nameOrCode)) ?? africanCountry(nameOrCode);
}

function stateIn(country: AfricanCountry, name: string): string {
  const wanted = fold(name).replace(/ state$/, '');
  return country.states.find((s) => fold(s) === wanted) ?? '';
}

/** The label the digest and the picker share, such as "Lagos, Nigeria". */
export function placeLabel(place: ReaderPlace): string {
  const country = africanCountry(place.country);
  if (!country) return place.state;
  return place.state ? `${place.state}, ${country.name}` : country.name;
}

/**
 * Reads a saved label back into a place. Older saves hold a bare name such as
 * "Lagos", so a name without a country is looked up in the reader's current
 * country first.
 */
export function readerPlaceOf(label: string, currentCountry = ''): ReaderPlace {
  const split = label.lastIndexOf(',');
  if (split >= 0) {
    const country = countryNamed(label.slice(split + 1));
    if (country)
      return {
        country: country.code,
        state: stateIn(country, label.slice(0, split)),
      };
  }
  const current = africanCountry(currentCountry);
  const state = current ? stateIn(current, label) : '';
  if (current && state) return { country: current.code, state };
  const country = countryNamed(label);
  return country
    ? { country: country.code, state: '' }
    : { country: '', state: '' };
}

export function matchingCountries(query: string): readonly AfricanCountry[] {
  const wanted = fold(query);
  if (!wanted) return AFRICAN_COUNTRIES;
  return AFRICAN_COUNTRIES.filter(
    (c) => fold(c.name).includes(wanted) || c.code.toLowerCase() === wanted,
  );
}

export function matchingStates(
  country: AfricanCountry,
  query: string,
): string[] {
  const wanted = fold(query);
  return wanted
    ? country.states.filter((s) => fold(s).includes(wanted))
    : country.states;
}
