import { Suspense, useEffect } from 'react';
import { sessionStore } from './lib/auth';
import { themeStore } from './lib/preferences';
import { useRoute, type Route } from './lib/router';
import { useStore } from './lib/store';
import { openOverlay, overlayStore } from './lib/ui';
import { AuthModal, PreferencesModal } from './components/AuthModal';
import { CookieBanner, CookieSettings } from './components/CookieBanner';
import { DigestFab } from './components/DigestFab';
import { Footer, MobileLegal } from './components/Footer';
import { Header } from './components/Header';
import { MobileTabBar } from './components/MobileTabBar';
import { OnboardingTour } from './components/OnboardingTour';
import { PlansModal } from './components/PlansModal';
import { Toast } from './components/Toast';
import { HomeScreen } from './screens/HomeScreen';
import {
  CategoriesScreen,
  CategoryScreen,
  ContributeScreen,
  DigestScreen,
  FeedScreen,
  IssueScreen,
  LegalScreen,
  ListingScreen,
  NotFoundScreen,
  PlaceScreen,
  PlacesScreen,
  PromoScreen,
  PromosScreen,
  SearchScreen,
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
    case 'digest':
      return <DigestScreen />;
    case 'issue':
      return <IssueScreen key={route.id} id={route.id} />;
    case 'contribute':
      return <ContributeScreen key={route.kind} kind={route.kind} />;
    case 'search':
      return <SearchScreen key={route.query} query={route.query} />;
    case 'legal':
      return <LegalScreen doc={route.doc} />;
    case 'not-found':
      return <NotFoundScreen />;
  }
}

export function App() {
  const route = useRoute();
  const theme = useStore(themeStore);
  const overlay = useStore(overlayStore);

  // The theme lives on <html>, so the tokens in index.css switch with it.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0d0d0d' : '#f2f2f2');
  }, [theme]);

  // Readers who are not signed in see the sign-up card every time they land
  // on home. It is the one way in to the digest, so it always shows.
  useEffect(() => {
    if (route.page === 'home' && !sessionStore.get()) openOverlay('auth');
  }, [route.page]);

  return (
    <>
      <Header />
      <main id="main" className="min-h-[60vh]">
        {/* An empty, full-height box while a screen chunk loads: no spinner flash. */}
        <Suspense fallback={<div className="min-h-[70vh]" />}>
          <Screen route={route} />
        </Suspense>
      </main>
      <Footer />
      {route.page === 'home' && <MobileLegal />}
      <MobileTabBar />
      <DigestFab />
      <CookieBanner />
      {route.page === 'home' && overlay !== 'auth' && <OnboardingTour />}
      {overlay === 'cookies' && <CookieSettings />}
      {overlay === 'plans' && <PlansModal />}
      {overlay === 'auth' && <AuthModal />}
      {overlay === 'prefs' && <PreferencesModal />}
      <Toast />
    </>
  );
}
