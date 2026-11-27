import { Suspense, useEffect } from 'react';
import { catalogueStore } from './lib/api';
import { themeStore } from './lib/preferences';
import { useRoute, type Route } from './lib/router';
import { useStore } from './lib/store';
import { applyPageMeta, pageMeta } from './lib/seo';
import { overlayStore } from './lib/ui';
import { AskLauncher, AssistantPanel } from './components/AskMembrs';
import { PreferencesModal } from './components/PreferencesModal';
import { CookieBanner, CookieSettings } from './components/CookieBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { MobileTabBar } from './components/MobileTabBar';
import { OnboardingTour } from './components/OnboardingTour';
import { PlansModal } from './components/PlansModal';
import { Presence } from './components/Presence';
import { Toast } from './components/Toast';
import { HomeScreen } from './screens/HomeScreen';
import {
  CategoriesScreen,
  CategoryScreen,
  ContributeScreen,
  FeedScreen,
  LegalScreen,
  ListingScreen,
  NotFoundScreen,
  PlaceScreen,
  PlacesScreen,
  PromoScreen,
  PromosScreen,
  SearchScreen,
  ForYouScreen,
  UnsubscribeScreen,
} from './screens/lazy';

function Screen({ route }: { route: Route }) {
  switch (route.page) {
    case 'home':
      return <HomeScreen />;
    case 'feed':
      if (route.feed === 'events')
        return <FeedScreen key="event" kind="event" />;
      if (route.feed === 'opportunities')
        return <FeedScreen key="opportunity" kind="opportunity" />;
      if (route.feed === 'places') return <PlacesScreen />;
      return <PromosScreen />;
    case 'categories':
      return <CategoriesScreen feed={route.feed} />;
    case 'category':
      return <CategoryScreen slug={route.slug} />;
    case 'listing':
      return <ListingScreen key={route.id} id={route.id} />;
    case 'place':
      return <PlaceScreen key={route.id} id={route.id} />;
    case 'promo':
      return <PromoScreen key={route.id} id={route.id} />;
    case 'contribute':
      return <ContributeScreen key={route.kind} kind={route.kind} />;
    case 'search':
      return <SearchScreen key={route.query} query={route.query} />;
    case 'for-you':
      return <ForYouScreen />;
    case 'legal':
      return <LegalScreen doc={route.doc} />;
    case 'unsubscribe':
      return <UnsubscribeScreen token={route.token} notYou={route.notYou} />;
    case 'not-found':
      return <NotFoundScreen />;
  }
}

export function App() {
  const route = useRoute();
  const theme = useStore(themeStore);
  const overlay = useStore(overlayStore);
  useStore(catalogueStore);

  // The theme lives on <html>, so the tokens in index.css switch with it.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0d0d0d' : '#f2f2f2');
  }, [theme]);

  useEffect(() => {
    applyPageMeta(pageMeta(route));
  });

  return (
    <>
      <Header />
      <main
        id="main"
        className="min-h-[60vh] max-md:pb-[calc(92px+env(safe-area-inset-bottom,0px))]"
      >
        {/* An empty, full-height box while a screen chunk loads: no spinner flash. */}
        <ErrorBoundary resetKey={JSON.stringify(route)}>
          <Suspense fallback={<div className="min-h-[70vh]" />}>
            <Screen route={route} />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <MobileTabBar />
      <AskLauncher />
      <CookieBanner />
      {route.page === 'home' && <OnboardingTour />}
      <Presence value={overlay}>
        {(shown) =>
          ({
            cookies: <CookieSettings />,
            plans: <PlansModal />,
            prefs: <PreferencesModal />,
            assistant: <AssistantPanel />,
          })[shown]
        }
      </Presence>
      <Toast />
    </>
  );
}
