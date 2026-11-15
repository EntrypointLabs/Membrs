import { shown } from '../lib/sections';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  alternated,
  closingSoon,
  forYou,
  heroPicks,
  inCity,
  launchCities,
  mostPopular,
  places,
  promos,
  within,
} from '../lib/api';
import { grantedPosition, nearestCity } from '../lib/geo';
import { openStateNow } from '../lib/hours';
import {
  cityStore,
  interestsStore,
  subscriptionStore,
} from '../lib/preferences';
import { paths } from '../lib/router';
import { useStore } from '../lib/store';
import { titleCase } from '../lib/text';
import { openOverlay } from '../lib/ui';
import type { Listing, OpportunityListing } from '../lib/types';
import { DeadlineRow } from '../components/DeadlineRow';
import { HeroCarousel } from '../components/HeroCarousel';
import { ListingRow } from '../components/ListingRow';
import { ContributeMenu } from '../components/ContributeMenu';
import { HeadingCount } from '../components/HeadingCount';
import { Icon } from '../components/Icon';
import { Link } from '../components/Link';
import { ListingCard } from '../components/ListingCard';
import { MostPopular } from '../components/MostPopular';
import { clampPage, Pager, pageOf } from '../components/Pager';
import { PlaceCard } from '../components/PlaceCard';
import { PlaceRow } from '../components/PlaceRow';
import { PromoCard } from '../components/PromoCard';
import { Rail } from '../components/Rail';
import { SectionHeader } from '../components/SectionHeader';
import { Select } from '../components/Select';
import { Tabs } from '../components/Tabs';
import { TitleBar } from '../components/TitleBar';
import { CategoryTiles } from './CategoriesScreen';

type Range = 'week' | 'month';

const HOME_LIST = 5;
type KindFilter = 'all' | Listing['kind'];

/**
 * Home, ordered by importance: what to do soonest, what closes soonest, what
 * is near you, then places, promos, categories and the latest digest.
 */
const POPULAR_PANEL = 10;

export function HomeScreen() {
  const city = useStore(cityStore);
  const picks = useMemo(() => heroPicks(3), []);
  const popular = useMemo(
    () => mostPopular(POPULAR_PANEL, new Set(picks.map((p) => p.id))),
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

      <PhoneHome />
      <ThisWeek />
      <ClosingSoon />
      <NearYou key={city} city={city} />
      {shown('places') && <PlacesToGo />}
      {shown('promos') && <PromosSection />}
      <CategoriesSection />
    </div>
  );
}

function MobileTop({ city }: { city: string }) {
  return (
    <TitleBar className="flex items-center justify-between">
      <span data-tour="city">
        <Select
          label="City"
          icon="pin"
          value={city}
          onChange={(c) => cityStore.set(c)}
          className="h-11 font-semibold"
          options={launchCities().map((c) => ({
            value: c.name,
            label: c.status === 'soon' ? `${c.name} (soon)` : c.name,
            disabled: c.status === 'soon',
          }))}
        />
      </span>
      <span className="flex gap-2">
        <ContributeMenu
          align="end"
          trigger={
            <button
              type="button"
              aria-label="Contribute"
              className="bg-btn grid h-11 w-11 place-items-center rounded-md"
            >
              <Icon name="plus" className="h-5 w-5" />
            </button>
          }
        />
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
    </TitleBar>
  );
}

function PhoneSectionHead({
  title,
  href,
  link,
  count,
}: {
  title: string;
  href?: string;
  link?: string;
  count: number;
}) {
  return (
    <header className="mb-5 flex items-center justify-between gap-4 md:hidden">
      <h2 className="text-[26px] font-semibold tracking-tight">
        {titleCase(title)}
        <HeadingCount count={count} />
      </h2>
      {href && link && (
        <SeeAll href={href} className="-mr-2 shrink-0">
          {link}
        </SeeAll>
      )}
    </header>
  );
}

function PhoneList({
  title,
  items,
  href,
  link,
  tour,
}: {
  title: string;
  items: Listing[];
  href?: string;
  link?: string;
  tour?: string;
}) {
  if (!items.length) return null;
  return (
    <section data-tour={tour} className="mt-12 md:hidden">
      <PhoneSectionHead
        title={title}
        href={href}
        link={link}
        count={items.length}
      />
      <div className="border-line border-t">
        {items.slice(0, HOME_LIST).map((l) => (
          <ListingRow key={l.id} listing={l} />
        ))}
      </div>
    </section>
  );
}

function useGrantedCity(): string | null {
  const [city, setCity] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const cities = launchCities()
      .filter((c) => c.status === 'live')
      .map((c) => c.name);
    void grantedPosition().then((at) => {
      if (live && at) setCity(nearestCity(at, cities));
    });
    return () => {
      live = false;
    };
  }, []);
  return city;
}

function HappeningSoon() {
  const all = alternated<Listing>(within(3, 'event'), closingSoon());
  const items = all.slice(0, HOME_LIST);
  if (!items.length) return null;
  return (
    <section className="mt-12 md:hidden">
      <PhoneSectionHead
        title="Happening Soon"
        href={paths.feed('events')}
        link="Events"
        count={all.length}
      />
      <Rail>
        {items.map((l) => (
          <ListingCard key={l.id} listing={l} mixed />
        ))}
      </Rail>
    </section>
  );
}

function PhoneHome() {
  const interests = useStore(interestsStore);
  const subscribed = useStore(subscriptionStore);
  const nearCity = useGrantedCity();
  const week = within(7);
  const seen = new Set(week.map((l) => l.id));
  return (
    <>
      <HappeningSoon />
      {subscribed && (
        <PhoneList
          title="For You"
          items={forYou(interests)}
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
        items={within(30).filter((l) => !seen.has(l.id))}
        href={paths.feed('opportunities')}
        link="Opportunities"
      />
      <PhoneList title="Most Popular" items={mostPopular(HOME_LIST)} />
      {nearCity && (
        <PhoneList title={`Near You in ${nearCity}`} items={inCity(nearCity)} />
      )}
    </>
  );
}

function ThisWeek() {
  const [range, setRange] = useState<Range>('week');
  const [kind, setKind] = useState<KindFilter>('all');
  const [page, setPage] = useState(1);
  const items = within(range === 'week' ? 7 : 30, kind);
  const pages = Math.ceil(items.length / HOME_LIST);
  return (
    <section className="mt-16 hidden md:mt-[clamp(140px,11vw,200px)] md:block">
      <header className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="text-[44px] font-semibold tracking-tight">
            <span>
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
            <HeadingCount count={items.length} />
          </h2>
        </div>
        <div>
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
          {pageOf(items, page, HOME_LIST).map((l) => (
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

function ClosingSoon() {
  const [page, setPage] = useState(1);
  const items = closingSoon() as OpportunityListing[];
  const pages = Math.ceil(items.length / HOME_LIST);
  return (
    <section
      data-tour="closing"
      className="mt-16 hidden md:mt-[clamp(140px,11vw,200px)] md:block"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-[clamp(64px,7vw,128px)]">
        <div className="lg:top-bar self-start lg:sticky">
          <h2 className="text-[44px] font-semibold tracking-tight">
            Closing Soon
            <HeadingCount count={items.length} />
          </h2>
          <Link
            href={paths.feed('opportunities')}
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

function NearYou({ city }: { city: string }) {
  const [page, setPage] = useState(1);
  const items = inCity(city, 'event');
  return (
    <section className="mt-16 hidden md:mt-[clamp(140px,11vw,200px)] md:block">
      <SectionHeader
        title="Near you"
        count={items.length}
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
  const openNow = places().filter((p) => openStateNow(p).open);
  return (
    <>
      {openNow.length > 0 && (
        <section className="mt-12 md:hidden">
          <PhoneSectionHead
            title="Open Now"
            href={paths.feed('places')}
            link="Places"
            count={openNow.length}
          />
          <div className="border-line border-t">
            {openNow.slice(0, HOME_LIST).map((p) => (
              <PlaceRow key={p.id} place={p} />
            ))}
          </div>
        </section>
      )}
      <section className="mt-16 hidden md:mt-[clamp(140px,11vw,200px)] md:block">
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
    </>
  );
}

function PromosSection() {
  const [page, setPage] = useState(1);
  const endingSoon = [...promos()].sort((a, b) => a.endsInDays - b.endsInDays);
  return (
    <>
      {endingSoon.length > 0 && (
        <section className="mt-12 md:hidden">
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
      <section className="mt-16 hidden md:mt-[clamp(140px,11vw,200px)] md:block">
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
    </>
  );
}

function CategoriesSection() {
  const [kind, setKind] = useState<'event' | 'opportunity'>('event');
  return (
    <section className="mt-16 hidden md:mt-[clamp(140px,11vw,200px)] md:block">
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
  const pages = Math.ceil(items.length / HOME_LIST);
  const current = clampPage(String(page), pages);
  return (
    <>
      <Rail>{pageOf(items, current, HOME_LIST).map(render)}</Rail>
      <div className="hidden md:block">
        <Pager
          page={current}
          pages={pages}
          total={items.length}
          onChange={onPage}
        />
      </div>
    </>
  );
}

export function SeeAll({
  href,
  children,
  className = '',
}: {
  href: string;
  children: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`text-fg-3 hover:text-fg flex h-10 items-center gap-1 px-2 text-[15px] font-semibold ${className}`}
    >
      {children} <Icon name="chevronRight" className="h-4 w-4" />
    </Link>
  );
}
