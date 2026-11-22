import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { loadAccount, loadCatalogue } from './lib/api';
import { flushOutbox } from './lib/outbox';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}
const syncAccount = () => flushOutbox().then(loadAccount);
void loadCatalogue();

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

window.addEventListener('online', () => void flushOutbox());

void syncAccount();
