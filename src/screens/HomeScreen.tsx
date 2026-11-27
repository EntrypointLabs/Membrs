import { useHomeFilters } from './HomeFilters';
import { shown } from '../lib/sections';
import { useEffect, useState } from 'react';
import { area, context, track } from '../lib/analytics';
import {
  FOR_YOU_SECTION,
  homePath,
  launchCities,
  places,
  promos,
  readerCountryStore,
  useHome,
  useSectionItems,
  windowedPath,
  type HomeParams,
  type SectionPath,
} from '../lib/api';
import { chooseCity, readGrantedLocation } from '../lib/location';
import { africanCountry } from '../lib/africa';
import { useIsPhone } from '../lib/media';
import { openStateNow } from '../lib/hours';
import { cityStore } from '../lib/preferences';
import { paths, useRoute } from '../lib/router';
import { useStore } from '../lib/store';
import { homeParamsOf, useReader, type HomeTabs } from '../lib/homeParams';
import { openOverlay } from '../lib/ui';
import type {
  HomePage,
  ListingKind,
  OpportunitySummary,
  Section,
} from '../lib/types';
import { DeadlineRow } from '../components/DeadlineRow';
import { FeedSearch } from '../components/FeedSearch';
import { HeroCarousel } from '../components/HeroCarousel';
import { UseMyLocation } from '../components/UseMyLocation';
import { HomeShelves, LocalShelves } from './HomeShelves';
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
import { Pager } from '../components/Pager';
import { PlaceCard } from '../components/PlaceCard';
import { PlaceRow } from '../components/PlaceRow';
import { PromoCard } from '../components/PromoCard';
import { Rail } from '../components/Rail';
import { RemoteGate } from '../components/CatalogueGate';
import { SectionGrid } from '../components/SectionGrid';
import { SectionHeader } from '../components/SectionHeader';
import { Select } from '../components/Select';
import { Tabs } from '../components/Tabs';
import { TitleBar } from '../components/TitleBar';
import { CategoryTiles } from './CategoriesScreen';
import { Empty } from './FeedLayout';
import { cn } from '../lib/utils';
import { PAGE_SIZE } from '../lib/config';

type Range = 'week' | 'month';

type KindFilter = 'all' | ListingKind;

const KIND_TABS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'event', label: 'Events' },
  { value: 'opportunity', label: 'Opportunities' },
];

const WEB_RAILS = new Set([
  'hero',
  'popularPanel',
  FOR_YOU_SECTION,
  'popular',
  'justAdded',
  'week',
  'closing',
]);
const PHONE_RAILS = new Set([
  'soon',
  FOR_YOU_SECTION,
  'popular',
  'justAdded',
  'week',
  'month',
]);
const LOCAL_SHELVES = new Set(['nearby', 'country']);

type Tabbed = HomeTabs;

function useHomeParams(phone: boolean, tabs: Tabbed): HomeParams {
  return homeParamsOf(phone, useReader(), tabs);
}

export interface HomeSections {
  find: (id: string) => Section | undefined;
  local: Section[];
  shelves: Section[];
  pathOf: SectionPath;
}

function homeSections(
  page: HomePage,
  shownPath: string,
  rails: ReadonlySet<string>,
): HomeSections {
  return {
    find: (id) => page.sections.find((s) => s.id === id),
    local: page.sections.filter((s) => LOCAL_SHELVES.has(s.id)),
    shelves: page.sections.filter(
      (s) => !rails.has(s.id) && !LOCAL_SHELVES.has(s.id),
    ),
    pathOf: (window) => windowedPath(shownPath, window),
  };
}

export function HomeScreen() {
  const city = useStore(cityStore);
  useLocationOnVisit();
  const phone = useIsPhone();
  const route = useRoute();
  const [tabs, setTabs] = useState<Tabbed>({
    popular: 'all',
    range: 'week',
    weekKind: 'all',
  });
  const params = useHomeParams(phone, tabs);
  const remote = useHome(params);
  const shownPath = remote.shownPath ?? homePath(params);
  const toolbar = <MobileTop city={city} />;
  const filters = useHomeFilters(toolbar);
  const counts = remote.data?.counts;
  const listed = counts
    ? counts.event + counts.opportunity > 0
    : remote.status !== 'ready';

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
      ) : (
        <RemoteGate route={route} remote={remote}>
          {(page) =>
            phone ? (
              <PhoneSections
                sections={homeSections(page, shownPath, PHONE_RAILS)}
              />
            ) : (
              <WebSections
                sections={homeSections(page, shownPath, WEB_RAILS)}
                tabs={tabs}
                onTabs={setTabs}
              />
            )
          }
        </RemoteGate>
      )}
    </div>
  );
}

function WebSections({
  sections,
  tabs,
  onTabs,
}: {
  sections: HomeSections;
  tabs: Tabbed;
  onTabs: (tabs: Tabbed) => void;
}) {
  const country = useStore(readerCountryStore);
  const picks = sections.find('hero')?.items ?? [];
  const panel = sections.find('popularPanel')?.items ?? [];
  const forYou = sections.find(FOR_YOU_SECTION);
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
      <LocalShelves shelves={forYou ? [forYou] : []} pathOf={sections.pathOf} />
      <PopularSection
        section={sections.find('popular')}
        pathOf={sections.pathOf}
        kind={tabs.popular}
        onKind={(popular) => onTabs({ ...tabs, popular })}
      />
      <JustAddedSection
        section={sections.find('justAdded')}
        pathOf={sections.pathOf}
      />
      <LocalShelves
        key={country}
        shelves={sections.local}
        pathOf={sections.pathOf}
      />
      <ThisWeek
        section={sections.find('week')}
        pathOf={sections.pathOf}
        range={tabs.range}
        onRange={(range) => onTabs({ ...tabs, range })}
        kind={tabs.weekKind}
        onKind={(weekKind) => onTabs({ ...tabs, weekKind })}
      />
      <ClosingSoon
        section={sections.find('closing')}
        pathOf={sections.pathOf}
      />
      <LaterSections sections={sections} />
    </>
  );
}

function PhoneSections({ sections }: { sections: HomeSections }) {
  const country = useStore(readerCountryStore);
  const list = (id: string) => sections.find(id);
  const forYou = list(FOR_YOU_SECTION);
  return (
    <>
      <HappeningSoon section={list('soon')} />
      {forYou && (
        <PhoneList
          title="For You"
          items={forYou.items}
          count={forYou.total}
          href={paths.forYou()}
          link="See all"
        />
      )}
      <PhoneList title="Popular" items={list('popular')?.items ?? []} />
      <PhoneList title="Just Added" items={list('justAdded')?.items ?? []} />
      <LocalShelves
        key={country}
        shelves={sections.local}
        pathOf={sections.pathOf}
      />
      <PhoneList
        title="This Week"
        items={list('week')?.items ?? []}
        href={paths.feed('events')}
        link="Events"
        tour="week"
      />
      <PhoneList
        title="This Month"
        items={list('month')?.items ?? []}
        href={paths.feed('opportunities')}
        link="Opportunities"
      />
      <LaterSections sections={sections} />
    </>
  );
}

function LaterSections({ sections }: { sections: HomeSections }) {
  return (
    <>
      {shown('places') && <PlacesToGo />}
      {shown('promos') && <PromosSection />}
      <CategoriesSection />
      <HomeShelves shelves={sections.shelves} pathOf={sections.pathOf} />
    </>
  );
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

function HappeningSoon({ section }: { section: Section | undefined }) {
  const items = section?.items.slice(0, HOME_LIST) ?? [];
  if (!section || !items.length) return null;
  return (
    <section className="mt-6 md:hidden" {...area('happening_soon')}>
      <PhoneSectionHead
        title="Happening Soon"
        href={paths.feed('events')}
        link="Events"
        count={section.total}
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
  section,
  pathOf,
  kind,
  onKind,
}: {
  section: Section | undefined;
  pathOf: SectionPath;
  kind: KindFilter;
  onKind: (kind: KindFilter) => void;
}) {
  const [page, setPage] = useState(1);
  if (!section || (!section.total && kind === 'all')) return null;
  return (
    <section className="mt-[clamp(140px,11vw,200px)]" {...area('popular')}>
      <SectionHeader
        title="Popular"
        count={section.total}
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
      <SectionGrid
        section={section}
        pathOf={pathOf}
        page={page}
        onPage={setPage}
        render={(l) => <ListingCard key={l.id} listing={l} mixed />}
      />
    </section>
  );
}

function JustAddedSection({
  section,
  pathOf,
}: {
  section: Section | undefined;
  pathOf: SectionPath;
}) {
  const [page, setPage] = useState(1);
  if (!section?.total) return null;
  return (
    <section className="mt-[clamp(140px,11vw,200px)]" {...area('just_added')}>
      <SectionHeader title="Just Added" count={section.total} />
      <SectionGrid
        section={section}
        pathOf={pathOf}
        page={page}
        onPage={setPage}
        render={(l) => <ListingCard key={l.id} listing={l} mixed />}
      />
    </section>
  );
}

function ThisWeek({
  section,
  pathOf,
  range,
  onRange,
  kind,
  onKind,
}: {
  section: Section | undefined;
  pathOf: SectionPath;
  range: Range;
  onRange: (range: Range) => void;
  kind: KindFilter;
  onKind: (kind: KindFilter) => void;
}) {
  const [page, setPage] = useState(1);
  const empty: Section = { id: 'week', title: '', total: 0, items: [] };
  const shownSection = section ?? empty;
  const { items } = useSectionItems(shownSection, page, PAGE_SIZE, pathOf);
  const total = shownSection.total;
  const pages = Math.ceil(total / PAGE_SIZE);
  if (!total && kind === 'all' && range === 'week') return null;
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
            <HeadingCount count={total} />
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
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} mixed />
          ))}
        </Rail>
      </div>
      <Pager page={page} pages={pages} total={total} onChange={setPage} />
    </section>
  );
}

function ClosingSoon({
  section,
  pathOf,
}: {
  section: Section | undefined;
  pathOf: SectionPath;
}) {
  const [page, setPage] = useState(1);
  const empty: Section = { id: 'closing', title: '', total: 0, items: [] };
  const { items } = useSectionItems(section ?? empty, page, HOME_LIST, pathOf);
  const total = section?.total ?? 0;
  const pages = Math.ceil(total / HOME_LIST);
  if (!total) return null;
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
            <HeadingCount count={total} />
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
            {(items as OpportunitySummary[]).map((l) => (
              <DeadlineRow key={l.id} listing={l} />
            ))}
          </div>
          <Pager page={page} pages={pages} total={total} onChange={setPage} />
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
