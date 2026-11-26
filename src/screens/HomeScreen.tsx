import { useHomeFilters } from './HomeFilters';
import { shown } from '../lib/sections';
import { useEffect, useState } from 'react';
import { area, context, track } from '../lib/analytics';
import {
  alternated,
  closingSoon,
  forYou,
  forYouStore,
  heroPicks,
  launchCities,
  listings,
  attendable,
  mostPopular,
  places,
  promos,
  within,
  readerCountryStore,
} from '../lib/api';
import { chooseCity, readGrantedLocation } from '../lib/location';
import { africanCountry } from '../lib/africa';
import { distinctFamilies } from '../lib/families';
import { useIsPhone } from '../lib/media';
import { justAdded } from '../lib/filters';
import { placement } from '../lib/placement';
import { openStateNow } from '../lib/hours';
import { cityStore, subscriptionStore } from '../lib/preferences';
import { paths } from '../lib/router';
import { useStore } from '../lib/store';
import { openOverlay } from '../lib/ui';
import type { Listing, OpportunityListing } from '../lib/types';
import { DeadlineRow } from '../components/DeadlineRow';
import { FeedSearch } from '../components/FeedSearch';
import { HeroCarousel } from '../components/HeroCarousel';
import { UseMyLocation } from '../components/UseMyLocation';
import { HomeShelves, LocalShelves, useShelfInputs } from './HomeShelves';
import { localShelves } from '../lib/homeShelves';
import { PagedGrid } from '../components/PagedGrid';
import {
  HOME_LIST,
  PhoneList,
  PhoneSectionHead,
  SeeAll,
} from '../components/PhoneList';
import { ContributeMenu } from '../components/ContributeMenu';
import { HeadingCount } from '../components/HeadingCount';
import { PhoneSettings } from '../components/Header';
import { Icon } from '../components/Icon';
import { Link } from '../components/Link';
import { ListingCard } from '../components/ListingCard';
import { MostPopular } from '../components/MostPopular';
import { Pager, pageOf } from '../components/Pager';
import { PlaceCard } from '../components/PlaceCard';
import { PlaceRow } from '../components/PlaceRow';
import { PromoCard } from '../components/PromoCard';
import { Rail } from '../components/Rail';
import { SectionHeader } from '../components/SectionHeader';
import { Select } from '../components/Select';
import { Tabs } from '../components/Tabs';
import { TitleBar } from '../components/TitleBar';
import { CategoryTiles } from './CategoriesScreen';
import { Empty } from './FeedLayout';
import { cn } from '../lib/utils';
import { PAGE_SIZE, POPULAR_SIZE } from '../lib/config';

type Range = 'week' | 'month';

type KindFilter = 'all' | Listing['kind'];

const KIND_TABS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'event', label: 'Events' },
  { value: 'opportunity', label: 'Opportunities' },
];

const POPULAR_PANEL = 10;

export function HomeScreen() {
  const city = useStore(cityStore);
  useStore(readerCountryStore);
  useLocationOnVisit();
  const phone = useIsPhone();
  const toolbar = <MobileTop city={city} />;
  const filters = useHomeFilters(toolbar);
  const listed = listings().length > 0;

  return (
    <div className="page">
      <h1 className="sr-only">MEMBRS</h1>
      {!listed && (
        <>
          <TitleBar>
            <FeedSearch />
          </TitleBar>
          {toolbar}
        </>
      )}
      <div className="hidden md:block md:h-10" />
      {listed && filters.line}
      {!listed ? (
        <>
          <Empty />
          <CategoriesSection />
        </>
      ) : filters.results ? (
        <>
          {filters.results}
          <CategoriesSection />
        </>
      ) : phone ? (
        <PhoneSections />
      ) : (
        <WebSections />
      )}
    </div>
  );
}

function WebSections() {
  const country = useStore(readerCountryStore);
  const [popularKind, setPopularKind] = useState<KindFilter>('all');
  const [range, setRange] = useState<Range>('week');
  const [weekKind, setWeekKind] = useState<KindFilter>('all');
  const picks = heroPicks(3);
  const panel = distinctFamilies(
    mostPopular(POPULAR_PANEL * 2, idsOf(picks)),
    picks,
    POPULAR_PANEL,
  );
  const page = placement([...picks, ...panel]);
  const popular = page.take(
    distinctFamilies(
      mostPopular(POPULAR_SIZE * 2, new Set(), popularKind),
      page.placed(),
    ),
    POPULAR_SIZE,
  );
  const fresh = page.take(
    distinctFamilies(justAdded(attendable()), page.placed()),
    POPULAR_SIZE,
  );
  const local = localShelves(useShelfInputs(page.placed()));
  page.take(local.flatMap((shelf) => shelf.items));
  const closing = page.take(closingSoon());
  const week = page.take(within(range === 'week' ? 7 : 30, weekKind));
  return (
    <>
      {(picks.length > 0 || panel.length > 0) && (
        <section
          className={cn(
            'mt-12 grid gap-8 xl:gap-12',
            picks.length > 0 &&
              panel.length > 0 &&
              'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]',
          )}
        >
          {picks.length > 0 && (
            <div className="lg:top-bar self-start lg:sticky">
              <HeroCarousel picks={picks} />
            </div>
          )}
          <MostPopular items={panel} />
        </section>
      )}
      <PopularSection
        items={popular}
        kind={popularKind}
        onKind={setPopularKind}
      />
      <JustAddedSection items={fresh} />
      <LocalShelves key={country} shelves={local} />
      <ThisWeek
        items={week}
        range={range}
        onRange={setRange}
        kind={weekKind}
        onKind={setWeekKind}
      />
      <ClosingSoon items={closing} />
      <LaterSections shown={page.placed()} />
    </>
  );
}

function PhoneSections() {
  const country = useStore(readerCountryStore);
  const matches = useStore(forYouStore);
  const subscribed = useStore(subscriptionStore);
  const page = placement();
  const soon = page.take(
    alternated<Listing>(within(3, 'event'), closingSoon()),
    HOME_LIST,
  );
  const popular = page.take(
    distinctFamilies(mostPopular(HOME_LIST * 3), page.placed()),
    HOME_LIST,
  );
  const fresh = page.take(
    distinctFamilies(justAdded(attendable()), page.placed()),
    HOME_LIST,
  );
  const local = localShelves(useShelfInputs(page.placed()));
  page.take(local.flatMap((shelf) => shelf.items.slice(0, HOME_LIST)));
  const picked = subscribed ? page.take(forYou(matches), HOME_LIST) : [];
  const week = page.take(within(7), HOME_LIST);
  const month = page.take(within(30), HOME_LIST);
  return (
    <>
      <HappeningSoon items={soon} />
      <PhoneList title="Popular" items={popular} />
      <PhoneList title="Just Added" items={fresh} />
      <LocalShelves key={country} shelves={local} />
      {subscribed && (
        <PhoneList
          title="For You"
          items={picked}
          href={paths.forYou()}
          link="See all"
        />
      )}
      <PhoneList
        title="This Week"
        items={week}
        href={paths.feed('events')}
        link="Events"
        tour="week"
      />
      <PhoneList
        title="This Month"
        items={month}
        href={paths.feed('opportunities')}
        link="Opportunities"
      />
      <LaterSections shown={page.placed()} />
    </>
  );
}

function LaterSections({ shown: placed }: { shown: Listing[] }) {
  return (
    <>
      {shown('places') && <PlacesToGo />}
      {shown('promos') && <PromosSection />}
      <CategoriesSection />
      <HomeShelves shown={placed} />
    </>
  );
}

function idsOf(listings: Listing[]): Set<string> {
  return new Set(listings.map((l) => l.id));
}

function MobileTop({ city }: { city: string }) {
  return (
    <div className="mt-1 md:hidden">
      <div
        className="flex items-center justify-between"
        {...area('mobile_top')}
      >
        <span data-tour="city" className="flex items-center gap-2">
          <Select
            label="City"
            icon="pin"
            value={city}
            onChange={chooseCity}
            className="h-11 font-semibold"
            options={withCity(placeOptions(), city)}
          />
          <UseMyLocation iconOnly className="bg-btn h-11 w-11 rounded-md" />
        </span>
        <span className="flex gap-2">
          <ContributeMenu
            align="end"
            trigger={
              <button
                type="button"
                aria-label="Contribute"
                className="bg-btn grid h-11 w-11 place-items-center rounded-md"
                {...context({ action: 'contribute_menu' })}
              >
                <Icon name="plus" className="h-5 w-5" />
              </button>
            }
          />
          <button
            type="button"
            data-tour="plans"
            onClick={() => openOverlay('plans')}
            {...context({ action: 'plans' })}
            aria-label="Your plans"
            className="bg-btn grid h-11 w-11 place-items-center rounded-md"
          >
            <Icon name="cal" className="h-5 w-5" />
          </button>
          <PhoneSettings />
        </span>
      </div>
    </div>
  );
}

function useLocationOnVisit(): void {
  useEffect(() => {
    void readGrantedLocation();
  }, []);
}

/** The states of the reader's country, or the launch cities outside Africa. */
function placeOptions(): {
  value: string;
  label: string;
  disabled?: boolean;
}[] {
  const country = africanCountry(readerCountryStore.get());
  if (country?.states.length)
    return country.states.map((state) => ({ value: state, label: state }));
  return launchCities().map((c) => ({
    value: c.name,
    label: c.status === 'soon' ? `${c.name} (soon)` : c.name,
    disabled: c.status === 'soon',
  }));
}

function withCity<T extends { value: string; label: string }>(
  options: T[],
  city: string,
): (T | { value: string; label: string })[] {
  return options.some((o) => o.value === city)
    ? options
    : [...options, { value: city, label: city }];
}

function HappeningSoon({ items: all }: { items: Listing[] }) {
  const items = all.slice(0, HOME_LIST);
  if (!items.length) return null;
  return (
    <section className="mt-6 md:hidden" {...area('happening_soon')}>
      <PhoneSectionHead
        title="Happening Soon"
        href={paths.feed('events')}
        link="Events"
        count={all.length}
      />
      <Rail swipe>
        {items.map((l) => (
          <ListingCard key={l.id} listing={l} mixed />
        ))}
      </Rail>
    </section>
  );
}

function PopularSection({
  items,
  kind,
  onKind,
}: {
  items: Listing[];
  kind: KindFilter;
  onKind: (kind: KindFilter) => void;
}) {
  const [page, setPage] = useState(1);
  if (!items.length && kind === 'all') return null;
  return (
    <section className="mt-[clamp(140px,11vw,200px)]" {...area('popular')}>
      <SectionHeader
        title="Popular"
        count={items.length}
        actions={
          <Tabs
            label="Show"
            value={kind}
            onChange={(k) => {
              onKind(k);
              setPage(1);
            }}
            options={KIND_TABS}
          />
        }
      />
      <PagedGrid
        items={items}
        page={page}
        onPage={setPage}
        render={(l) => <ListingCard key={l.id} listing={l} mixed />}
      />
    </section>
  );
}

function JustAddedSection({ items }: { items: Listing[] }) {
  const [page, setPage] = useState(1);
  if (!items.length) return null;
  return (
    <section className="mt-[clamp(140px,11vw,200px)]" {...area('just_added')}>
      <SectionHeader title="Just Added" count={items.length} />
      <PagedGrid
        items={items}
        page={page}
        onPage={setPage}
        render={(l) => <ListingCard key={l.id} listing={l} mixed />}
      />
    </section>
  );
}

function ThisWeek({
  items,
  range,
  onRange,
  kind,
  onKind,
}: {
  items: Listing[];
  range: Range;
  onRange: (range: Range) => void;
  kind: KindFilter;
  onKind: (kind: KindFilter) => void;
}) {
  const [page, setPage] = useState(1);
  const pages = Math.ceil(items.length / PAGE_SIZE);
  if (!items.length && kind === 'all' && range === 'week') return null;
  return (
    <section
      className="mt-16 hidden md:mt-[clamp(140px,11vw,200px)] md:block"
      {...area('this_week')}
    >
      <header className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="text-[44px] font-semibold tracking-tight">
            <span>
              {(['week', 'month'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    if (r !== range) track('range_changed', { range: r });
                    onRange(r);
                    setPage(1);
                  }}
                  className={`mr-4 ${range === r ? 'text-fg' : 'text-fg-4 hover:text-fg-3'}`}
                >
                  This {r === 'week' ? 'Week' : 'Month'}
                </button>
              ))}
            </span>
            <HeadingCount count={items.length} />
          </h2>
        </div>
        <div>
          <Tabs
            label="Show"
            value={kind}
            onChange={(k) => {
              onKind(k);
              setPage(1);
            }}
            options={KIND_TABS}
          />
        </div>
      </header>
      <div data-tour="week">
        <Rail>
          {pageOf(items, page, PAGE_SIZE).map((l) => (
            <ListingCard key={l.id} listing={l} mixed />
          ))}
        </Rail>
      </div>
      <Pager
        page={page}
        pages={pages}
        total={items.length}
        onChange={setPage}
      />
    </section>
  );
}

function ClosingSoon({ items: listed }: { items: Listing[] }) {
  const [page, setPage] = useState(1);
  const items = listed as OpportunityListing[];
  const pages = Math.ceil(items.length / HOME_LIST);
  if (!items.length) return null;
  return (
    <section
      data-tour="closing"
      className="mt-16 hidden md:mt-[clamp(140px,11vw,200px)] md:block"
      {...area('closing_soon')}
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-[clamp(64px,7vw,128px)]">
        <div className="lg:top-bar self-start lg:sticky">
          <h2 className="text-[44px] font-semibold tracking-tight">
            Closing Soon
            <HeadingCount count={items.length} />
          </h2>
          <Link
            href={paths.feed('opportunities')}
            onClick={(e) =>
              track(
                'see_all_clicked',
                {
                  label: 'All opportunities',
                  href: paths.feed('opportunities'),
                },
                e.currentTarget,
              )
            }
            className="bg-btn hover:bg-btn-hover mt-7 inline-flex h-11 items-center gap-2 rounded-md px-5 font-bold"
          >
            All opportunities{' '}
            <Icon name="arrowUpRight" className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div>
          <div className="border-line border-t">
            {pageOf(items, page, HOME_LIST).map((l) => (
              <DeadlineRow key={l.id} listing={l} />
            ))}
          </div>
          <Pager
            page={page}
            pages={pages}
            total={items.length}
            onChange={setPage}
          />
        </div>
      </div>
    </section>
  );
}

function PlacesToGo() {
  const [page, setPage] = useState(1);
  const openNow = places().filter((p) => openStateNow(p).open);
  return (
    <>
      {openNow.length > 0 && (
        <section className="mt-12 md:hidden" {...area('open_now')}>
          <PhoneSectionHead
            title="Open Now"
            href={paths.feed('places')}
            link="Places"
            count={openNow.length}
          />
          <div>
            {openNow.slice(0, HOME_LIST).map((p) => (
              <PlaceRow key={p.id} place={p} />
            ))}
          </div>
        </section>
      )}
      {places().length > 0 && (
        <section
          className="mt-16 hidden md:mt-[clamp(140px,11vw,200px)] md:block"
          {...area('places_to_go')}
        >
          <SectionHeader
            title="Places to go"
            count={places().length}
            actions={<SeeAll href={paths.feed('places')}>All places</SeeAll>}
          />
          <PagedGrid
            items={places()}
            page={page}
            onPage={setPage}
            render={(p) => <PlaceCard key={p.id} place={p} mixed />}
          />
        </section>
      )}
    </>
  );
}

function PromosSection() {
  const [page, setPage] = useState(1);
  const endingSoon = [...promos()].sort((a, b) => a.endsInDays - b.endsInDays);
  return (
    <>
      {endingSoon.length > 0 && (
        <section className="mt-12 md:hidden" {...area('deals_ending_soon')}>
          <PhoneSectionHead
            title="Deals Ending Soon"
            href={paths.feed('promos')}
            link="Promos"
            count={endingSoon.length}
          />
          <Rail>
            {endingSoon.slice(0, HOME_LIST).map((p) => (
              <PromoCard key={p.id} promo={p} mixed />
            ))}
          </Rail>
        </section>
      )}
      {promos().length > 0 && (
        <section
          className="mt-16 hidden md:mt-[clamp(140px,11vw,200px)] md:block"
          {...area('promos')}
        >
          <SectionHeader
            title="Promos"
            count={promos().length}
            actions={<SeeAll href={paths.feed('promos')}>All promos</SeeAll>}
          />
          <PagedGrid
            items={promos()}
            page={page}
            onPage={setPage}
            render={(p) => <PromoCard key={p.id} promo={p} mixed />}
          />
        </section>
      )}
    </>
  );
}

function CategoriesSection() {
  const [kind, setKind] = useState<'event' | 'opportunity'>('event');
  return (
    <section
      className="mt-16 hidden md:mt-[clamp(140px,11vw,200px)] md:block"
      {...area('categories')}
    >
      <SectionHeader
        title="Browse by category"
        actions={
          <Tabs
            label="Category type"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'event', label: 'Events' },
              { value: 'opportunity', label: 'Opportunities' },
            ]}
          />
        }
      />
      <CategoryTiles kind={kind} limit={8} />
    </section>
  );
}
