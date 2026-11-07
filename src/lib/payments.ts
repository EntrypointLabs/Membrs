import type { AdQuote } from './ads';
import { API_BASE } from './config';

/**
 * Paying for ads with Bachs (https://docs.bachs.io).
 *
 * The browser never sees a secret key and never decides the price. It sends
 * the ad to our server, which recomputes the total, creates a Bachs checkout
 * session with the secret key and returns its `checkout_url`. The browser
 * opens that URL in Bachs' overlay. The ad goes to review only when the
 * server receives Bachs' `checkout.completed` webhook; the browser event just
 * moves the screen on. See docs/payments.md for the server half.
 *
 * Without VITE_API_BASE there is no server to create a session, so the
 * checkout runs in demo mode and the app shows its own stand-in overlay.
 */

export interface AdOrder {
  quote: AdQuote;
  values: Record<string, string>;
}

export type CheckoutResult =
  | { status: 'completed'; reference: string }
  | { status: 'closed' | 'failed' | 'expired'; reference: string };

interface BachsEvent {
  type:
    | 'checkout.ready'
    | 'checkout.completed'
    | 'checkout.failed'
    | 'checkout.expired'
    | 'checkout.closed'
    | 'checkout.error';
}

interface BachsGlobal {
  Initialize(options: { onEvent: (event: BachsEvent) => void }): void;
  Checkout: { open(options: { checkoutUrl: string }): void };
}

declare global {
  interface Window {
    Bachs?: BachsGlobal;
  }
}

const SCRIPT = 'https://checkout.bachs.io/bachs.js';

export const PAYMENTS_DEMO = !API_BASE;

let loading: Promise<BachsGlobal> | undefined;
let listener: ((event: BachsEvent) => void) | undefined;

/**
 * The Bachs script loads the first time someone pays, not on page load, so
 * nobody else downloads it. Initialize runs once; each checkout swaps in its
 * own listener.
 */
function loadBachs(): Promise<BachsGlobal> {
  return (loading ??= new Promise<BachsGlobal>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => {
      const bachs = window.Bachs;
      if (!bachs) return reject(new Error('Bachs did not load'));
      bachs.Initialize({ onEvent: (event) => listener?.(event) });
      resolve(bachs);
    };
    script.onerror = () => {
      loading = undefined;
      reject(new Error('Bachs did not load'));
    };
    document.head.appendChild(script);
  }));
}

/** Warm the script while the buyer is still filling the form. */
export function preloadCheckout(): void {
  if (!PAYMENTS_DEMO) void loadBachs().catch(() => undefined);
}

/** Create the session on our server, then open Bachs and wait for the outcome. */
export async function payForAd(order: AdOrder): Promise<CheckoutResult> {
  const res = await fetch(`${API_BASE}/v1/ads/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      placement: order.quote.placement,
      days: order.quote.days,
      values: order.values,
    }),
  });
  if (!res.ok) throw new Error('Could not start checkout');
  const { checkout_url: checkoutUrl, reference } = (await res.json()) as {
    checkout_url: string;
    reference: string;
  };
  const bachs = await loadBachs();
  return new Promise((resolve) => {
    listener = (event) => {
      const status = {
        'checkout.completed': 'completed',
        'checkout.failed': 'failed',
        'checkout.expired': 'expired',
        'checkout.closed': 'closed',
        'checkout.error': 'failed',
        'checkout.ready': null,
      }[event.type] as CheckoutResult['status'] | null;
      if (!status) return;
      listener = undefined;
      resolve({ status, reference });
    };
    bachs.Checkout.open({ checkoutUrl });
  });
}

/** A reference for demo payments, shaped like the server's. */
export function demoReference(): string {
  return `AD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
