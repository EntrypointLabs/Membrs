import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { initAnalytics } from './lib/analytics';
import {
  loadAccount,
  loadListing,
  loadVenuesIfShown,
  prefetchHome,
} from './lib/api';
import { homeParamsOf, readerNow } from './lib/homeParams';
import { isPhone } from './lib/media';
import { parseRoute } from './lib/router';
import { flushOutbox } from './lib/outbox';
import { keepServedListing } from './lib/served';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

keepServedListing(
  rootElement,
  window.location.pathname + window.location.search,
);

const route = parseRoute(window.location.pathname + window.location.search);
if (route.page === 'home') prefetchHome(homeParamsOf(isPhone(), readerNow()));
initAnalytics(
  route.page === 'listing'
    ? loadListing(route.id).catch(() => undefined)
    : Promise.resolve(),
);
void loadVenuesIfShown();

const syncAccount = () => flushOutbox().then(loadAccount);

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

window.addEventListener('online', () => void flushOutbox());

void syncAccount();
