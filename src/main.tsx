import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { loadAccount, loadCatalogue } from './lib/api';
import { completeSignIn, PROVIDER_NAME } from './lib/auth';
import { flushOutbox } from './lib/outbox';
import { subscriptionStore } from './lib/preferences';
import { openOverlay, toast } from './lib/ui';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const syncAccount = () => flushOutbox().then(loadAccount);
const [, signIn] = await Promise.all([loadCatalogue(), completeSignIn()]);
if (signIn?.status === 'signedIn') await syncAccount();
else void syncAccount();

if (signIn?.status === 'failed') {
  toast('Sign-in did not complete. Please try again.');
} else if (signIn?.status === 'signedIn') {
  if (subscriptionStore.get()) {
    toast(`Signed in with ${PROVIDER_NAME[signIn.provider]}.`);
  } else {
    openOverlay('prefs');
  }
}

window.addEventListener('online', () => void flushOutbox());

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
