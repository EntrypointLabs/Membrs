import type { ReactNode } from 'react';
import { area, context } from '../lib/analytics';
import { catalogueStore, loadCatalogue } from '../lib/api';
import { GRID_COLUMNS } from '../lib/config';
import type { Route } from '../lib/router';
import { servedListing, type ServedListing } from '../lib/served';
import { useStore } from '../lib/store';
import { Button } from './ui/button';
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from './ui/empty';
import { Skeleton } from './ui/skeleton';

export const CATALOGUE_FAILED = 'The listings could not load.';

/**
 * Holds a screen back until the catalogue has loaded, so no screen renders
 * from an empty catalogue and shows zero counts or bare shelves. While it
 * loads the reader sees the screen's shape; if it fails for good, one calm
 * message with a Retry.
 */
export function CatalogueGate({
  route,
  children,
}: {
  route: Route;
  children: ReactNode;
}) {
  const { status } = useStore(catalogueStore);
  if (status === 'ready') return children;
  const failed = status === 'failed';
  const served = route.page === 'listing' ? servedListing(route.id) : null;
  if (served) return <ServedListingPage listing={served} failed={failed} />;
  if (failed) return <CatalogueFailed />;
  return <CatalogueSkeleton route={route} />;
}

function retry() {
  void loadCatalogue();
}

function RetryButton() {
  return (
    <Button
      type="button"
      size="lg"
      onClick={retry}
      {...context({ action: 'retry_catalogue' })}
      className="bg-fg text-bg hover:bg-fg/90 h-11 px-5 font-bold"
    >
      Retry
    </Button>
  );
}

export function CatalogueFailed() {
  return (
    <div className="page" {...area('catalogue_gate')}>
      <Empty role="alert" className="min-h-[50vh]">
        <EmptyHeader>
          <EmptyTitle className="text-2xl font-semibold">
            {CATALOGUE_FAILED}
          </EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <RetryButton />
        </EmptyContent>
      </Empty>
    </div>
  );
}

const DETAIL_TITLE =
  'text-[clamp(30px,4vw,68px)] leading-[1.08] font-semibold tracking-tight text-pretty md:leading-[1.04]';

function ServedListingPage({
  listing,
  failed,
}: {
  listing: ServedListing;
  failed: boolean;
}) {
  return (
    <div className="page pt-7 md:pt-10" {...area('catalogue_gate')}>
      <h1 className={DETAIL_TITLE}>{listing.title}</h1>
      {listing.blurb && (
        <p className="text-fg-2 mt-6 max-w-[68ch] text-lg">{listing.blurb}</p>
      )}
      {failed ? (
        <div role="alert" className="mt-10 flex flex-wrap items-center gap-4">
          <p className="text-fg-3">The rest of this listing could not load.</p>
          <RetryButton />
        </div>
      ) : (
        <Skeleton className="rounded-photo mt-10 aspect-[2/1]" />
      )}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div>
      <Skeleton className="rounded-photo aspect-[4/3]" />
      <Skeleton className="mt-3 h-4 w-1/3" />
      <Skeleton className="mt-2 h-5 w-4/5" />
    </div>
  );
}

function CardGridSkeleton({ count = GRID_COLUMNS * 2 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

function HomeSkeleton() {
  return (
    <>
      <div className="border-line md:h-filters hidden items-center gap-5 border-b md:mt-10 md:flex">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-52" />
      </div>
      <section className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:gap-12">
        <div>
          <Skeleton className="rounded-photo aspect-[16/10]" />
          <Skeleton className="mt-6 h-10 w-3/4" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
        <div className="hidden rounded-lg md:block">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 py-4">
              <Skeleton className="rounded-photo h-[72px] w-[72px] shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="mt-2 h-5 w-5/6" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
      <Skeleton className="mt-24 mb-10 h-10 w-48" />
      <CardGridSkeleton count={GRID_COLUMNS} />
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col pt-7 md:pt-10">
      <Skeleton className="hidden h-4 w-48 md:block" />
      <Skeleton className="mt-7 h-12 w-4/5 md:mt-8 md:h-16" />
      <Skeleton className="rounded-photo -mx-4 aspect-[4/3] max-md:order-first md:mx-0 md:mt-10 md:aspect-[2/1]" />
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="pt-4 md:pt-14">
      <Skeleton className="h-12 w-56" />
      <Skeleton className="mt-8 mb-10 hidden h-10 w-64 md:block" />
      <CardGridSkeleton />
    </div>
  );
}

export function CatalogueSkeleton({ route }: { route: Route }) {
  const body =
    route.page === 'home' ? (
      <HomeSkeleton />
    ) : route.page === 'listing' ||
      route.page === 'place' ||
      route.page === 'promo' ? (
      <DetailSkeleton />
    ) : (
      <FeedSkeleton />
    );
  return (
    <div className="page" role="status" aria-busy="true">
      <span className="sr-only">Loading listings</span>
      {body}
    </div>
  );
}
