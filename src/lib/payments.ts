import type { AdQuote } from './ads';
import { authorizedFetch } from './auth';
import { ADS_CHECKOUT, API_BASE, CONTACT } from './config';
import { apiError, newIdempotencyKey } from './http';

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
  photo: string;
}

export type OrderStatus = 'awaiting_payment' | 'paid' | 'failed' | 'expired';

export type CheckoutResult = {
  status: 'completed' | 'pending' | 'closed' | 'failed' | 'expired';
  reference: string;
};

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

export const PAYMENTS_AVAILABLE = ADS_CHECKOUT;

export const PAYMENTS_DEMO = !API_BASE;

export const PAYMENTS_UNAVAILABLE_MESSAGE = `Ad payments are not available yet. Email ${CONTACT.ads} to book.`;

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
  if (PAYMENTS_AVAILABLE && !PAYMENTS_DEMO)
    void loadBachs().catch(() => undefined);
}

const orderKeys = new Map<string, string>();

function orderKeyFor(body: string): string {
  let key = orderKeys.get(body);
  if (!key) orderKeys.set(body, (key = newIdempotencyKey()));
  return key;
}

export async function startAdCheckout(
  order: AdOrder,
): Promise<{ checkoutUrl: string; reference: string }> {
  const body = JSON.stringify({
    placement: order.quote.placement,
    days: order.quote.days,
    values: order.values,
    photo: order.photo,
  });
  const res = await authorizedFetch('/v1/ads/checkout', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Idempotency-Key': orderKeyFor(body),
    },
    body,
  });
  if (!res.ok) throw await apiError(res, 'Could not start checkout');
  return (
    (await res.json()) as {
      data: { checkoutUrl: string; reference: string };
    }
  ).data;
}

const CONFIRM_ATTEMPTS = 10;
const CONFIRM_INTERVAL_MS = 1500;

export async function orderStatus(reference: string): Promise<OrderStatus> {
  const res = await authorizedFetch(
    `/v1/me/ads/orders/${encodeURIComponent(reference)}`,
  );
  if (!res.ok) throw await apiError(res, 'Could not check the payment');
  return ((await res.json()) as { data: { status: OrderStatus } }).data.status;
}

async function confirmPaid(reference: string): Promise<boolean> {
  for (let attempt = 0; attempt < CONFIRM_ATTEMPTS; attempt++) {
    const status = await orderStatus(reference).catch(
      () => 'awaiting_payment' as const,
    );
    if (status === 'paid') return true;
    if (status !== 'awaiting_payment') return false;
    await new Promise((resolve) => setTimeout(resolve, CONFIRM_INTERVAL_MS));
  }
  return false;
}

/** Create the session on our server, open Bachs, then confirm with the server. */
export async function payForAd(order: AdOrder): Promise<CheckoutResult> {
  if (!PAYMENTS_AVAILABLE) throw new Error(PAYMENTS_UNAVAILABLE_MESSAGE);
  const { checkoutUrl, reference } = await startAdCheckout(order);
  const bachs = await loadBachs();
  const outcome = await new Promise<CheckoutResult['status']>((resolve) => {
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
      resolve(status);
    };
    bachs.Checkout.open({ checkoutUrl });
  });
  if (outcome !== 'completed') return { status: outcome, reference };
  return (await confirmPaid(reference))
    ? { status: 'completed', reference }
    : { status: 'pending', reference };
}

/** A reference for demo payments, shaped like the server's. */
export function demoReference(): string {
  return `AD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
