import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { initAnalytics } from './lib/analytics';
import { loadAccount, loadCatalogue } from './lib/api';
import { flushOutbox } from './lib/outbox';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// The first pageview waits for the catalogue, so it can name the item a
// detail page shows.
const catalogue = loadCatalogue();
initAnalytics(catalogue);

const syncAccount = () => flushOutbox().then(loadAccount);

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

window.addEventListener('online', () => void flushOutbox());

void syncAccount();
