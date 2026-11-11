import { useMemo, useState, type ReactNode } from 'react';
import {
  closingSoon,
  feed,
  launchCities,
  listings,
  mostPopular,
  places,
  promos,
  within,
} from '../lib/api';
import { cityStore } from '../lib/preferences';
import { paths } from '../lib/router';
import { useStore } from '../lib/store';
import { openOverlay } from '../lib/ui';
import type { Listing, OpportunityListing } from '../lib/types';
import { DeadlineRow } from '../components/DeadlineRow';
import { HeroCarousel } from '../components/HeroCarousel';
import { Icon } from '../components/Icon';
import { Link } from '../components/Link';
import { ListingCard } from '../components/ListingCard';
import { MostPopular } from '../components/MostPopular';
import { Pager, pageOf } from '../components/Pager';
import { PlaceCard } from '../components/PlaceCard';
import { PromoCard } from '../components/PromoCard';
import { Rail } from '../components/Rail';
import { SectionHeader } from '../components/SectionHeader';
import { Select } from '../components/Select';
import { Tabs } from '../components/Tabs';
import { CategoryTiles } from './CategoriesScreen';

type Range = 'week' | 'month';

/** Closing Soon lists ten deadlines a page. */
const CLOSING_PAGE = 10;
/** Near You, Places and Promos show three by two cards a page on web. */
const GRID_PAGE = 6;
type KindFilter = 'all' | Listing['kind'];

/**
 * Home, ordered by importance: what to do soonest, what closes soonest, what
 * is near you, then places, promos, categories and the latest digest.
 */
export function HomeScreen() {
  const city = useStore(cityStore);
  const picks = useMemo(() => feed('event').slice(0, 3), []);
  const popular = useMemo(
    () => mostPopular(10, new Set(picks.map((p) => p.id))),
    [picks],
  );

  return (
    <div className="page">
      <MobileTop city={city} />

      <section className="mt-12 hidden gap-8 md:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:gap-12">
        <div className="lg:top-bar self-start lg:sticky">
          <HeroCarousel picks={picks} />
        </div>
        <MostPopular items={popular} />
      </section>

      <ThisWeek city={city} />
      <ClosingSoon />
      <NearYou city={city} />
      <PlacesToGo />
      <PromosSection />
      <CategoriesSection />
    </div>
  );
}

function MobileTop({ city }: { city: string }) {
  return (
    <div className="flex items-center justify-between pt-4 md:hidden">
      <label
        data-tour="city"
        className="bg-btn relative flex h-11 items-center gap-1.5 rounded-md px-3.5 font-semibold"
      >
        <Icon name="pin" className="text-accent" />
        {city}
        <Icon name="chevronDown" className="text-fg-3 h-3.5 w-3.5" />
        <select
          aria-label="City"
          value={city}
          onChange={(e) => cityStore.set(e.target.value)}
          className="absolute inset-0 opacity-0"
        >
          {launchCities().map((c) => (
            <option key={c.name} value={c.name} disabled={c.status === 'soon'}>
              {c.name}
              {c.status === 'soon' ? ' (soon)' : ''}
            </option>
          ))}
        </select>
      </label>
      <span className="flex gap-2">
        <Link
          href={paths.contribute()}
          aria-label="Contribute"
          className="bg-btn grid h-11 w-11 place-items-center rounded-md"
        >
          <Icon name="plus" className="h-5 w-5" />
        </Link>
        <button
          type="button"
          data-tour="plans"
          onClick={() => openOverlay('plans')}
          aria-label="Your plans"
          className="bg-btn grid h-11 w-11 place-items-center rounded-md"
        >
          <Icon name="cal" className="h-5 w-5" />
        </button>
      </span>
    </div>
  );
}

function ThisWeek({ city }: { city: string }) {
  const [range, setRange] = useState<Range>('week');
  const [kind, setKind] = useState<KindFilter>('all');
  const [page, setPage] = useState(1);
  const items = within(range === 'week' ? 7 : 30, kind);
  const pages = Math.ceil(items.length / 6);
  return (
    <section className="mt-12 md:mt-[clamp(140px,11vw,200px)]">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-6 md:mb-14">
        <div>
          <h2 className="text-[30px] font-semibold tracking-tight md:text-[44px]">
            <span className="md:hidden">This Week in {city}</span>
            <span className="hidden md:inline">
              {(['week', 'month'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRange(r);
                    setPage(1);
                  }}
                  className={`mr-4 ${range === r ? 'text-fg' : 'text-fg-4 hover:text-fg-3'}`}
                >
                  This {r === 'week' ? 'Week' : 'Month'}
                </button>
              ))}
            </span>
          </h2>
          <p className="text-fg-3 mt-3 hidden md:block">
            {items.length} happening or closing in the next{' '}
            {range === 'week' ? '7' : '30'} days, soonest first.
          </p>
        </div>
        <div className="hidden md:block">
          <Tabs
            label="Show"
            value={kind}
            onChange={(k) => {
              setKind(k);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All' },
              { value: 'event', label: 'Events' },
              { value: 'opportunity', label: 'Opportunities' },
            ]}
          />
        </div>
      </header>
      <div data-tour="week">
        <Rail>
          {pageOf(items, page, 6).map((l) => (
            <ListingCard key={l.id} listing={l} mixed />
          ))}
        </Rail>
      </div>
      <div className="hidden md:block">
        <Pager
          page={page}
          pages={pages}
          total={items.length}
          onChange={setPage}
        />
      </div>
    </section>
  );
}

function ClosingSoon() {
  const [page, setPage] = useState(1);
  const items = closingSoon() as OpportunityListing[];
  const pages = Math.ceil(items.length / CLOSING_PAGE);
  return (
    <section className="mt-16 grid gap-10 md:mt-[clamp(140px,11vw,200px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-[clamp(64px,7vw,128px)]">
      <div className="lg:top-bar self-start lg:sticky">
        <h2 className="text-[30px] font-semibold tracking-tight md:text-[44px]">
          Closing Soon
        </h2>
        <p className="text-fg-3 mt-3 max-w-sm">
          {items.length} grants, hackathons and calls closing in the next 30
          days, nearest deadline first.
        </p>
        <Link
          href={paths.feed('opportunities')}
          className="bg-btn hover:bg-btn-hover mt-7 inline-flex h-11 items-center gap-2 rounded-md px-5 font-bold"
        >
          All opportunities <Icon name="arrowUpRight" className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div data-tour="closing">
        <div className="border-line border-t">
          {pageOf(items, page, CLOSING_PAGE).map((l) => (
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
    </section>
  );
}

function NearYou({ city }: { city: string }) {
  const [page, setPage] = useState(1);
  const items = listings().filter((l) => l.kind === 'event' && l.city === city);
  return (
    <section className="mt-16 md:mt-[clamp(140px,11vw,200px)]">
      <SectionHeader
        title="Near you"
        body={
          <>
            Showing <b className="text-fg">{city}</b> · detected from your
            connection
          </>
        }
        actions={
          <>
            <Select
              label="City"
              value={city}
              onChange={(c) => cityStore.set(c)}
              options={launchCities()
                .filter((c) => c.status === 'live')
                .map((c) => ({ value: c.name, label: c.name }))}
            />
            <SeeAll href={paths.feed('events')}>All events</SeeAll>
          </>
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

function PlacesToGo() {
  const [page, setPage] = useState(1);
  return (
    <section className="mt-16 md:mt-[clamp(140px,11vw,200px)]">
      <SectionHeader
        title="Places to go"
        body="Beaches, parks, museums and libraries, with today's hours."
        actions={<SeeAll href={paths.feed('places')}>All places</SeeAll>}
      />
      <PagedGrid
        items={places()}
        page={page}
        onPage={setPage}
        render={(p) => <PlaceCard key={p.id} place={p} mixed />}
      />
    </section>
  );
}

function PromosSection() {
  const [page, setPage] = useState(1);
  return (
    <section className="mt-16 md:mt-[clamp(140px,11vw,200px)]">
      <SectionHeader
        title="Promos"
        body="Deals worth leaving the house for, and how to claim them."
        actions={<SeeAll href={paths.feed('promos')}>All promos</SeeAll>}
      />
      <PagedGrid
        items={promos()}
        page={page}
        onPage={setPage}
        render={(p) => <PromoCard key={p.id} promo={p} mixed />}
      />
    </section>
  );
}

function CategoriesSection() {
  const [kind, setKind] = useState<'event' | 'opportunity'>('event');
  return (
    <section className="mt-16 md:mt-[clamp(140px,11vw,200px)]">
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

/**
 * Three by two cards a page on web with the shared pager under them; on
 * phones the same page scrolls sideways as a rail.
 */
function PagedGrid<T>({
  items,
  page,
  onPage,
  render,
}: {
  items: T[];
  page: number;
  onPage: (page: number) => void;
  render: (item: T) => ReactNode;
}) {
  const pages = Math.ceil(items.length / GRID_PAGE);
  return (
    <>
      <Rail>{pageOf(items, page, GRID_PAGE).map(render)}</Rail>
      <div className="hidden md:block">
        <Pager
          page={page}
          pages={pages}
          total={items.length}
          onChange={onPage}
        />
      </div>
    </>
  );
}

export function SeeAll({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="text-fg-3 hover:text-fg flex h-10 items-center gap-1 px-2 text-[15px] font-semibold"
    >
      {children} <Icon name="chevronRight" className="h-4 w-4" />
    </Link>
  );
}
