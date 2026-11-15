import type { CaptureResult, PostHog, Properties } from 'posthog-js';
import { categoryBySlug, listingById, placeById, promoById } from './api';
import { sessionStore } from './auth';
import { API_BASE } from './config';
import { cookieStore, isChoiceCurrent, type CookieChoice } from './cookies';
import {
  cityStore,
  interestsStore,
  subscriptionStore,
  themeStore,
} from './preferences';
import { parseRoute, type Route } from './router';
import type { Store } from './store';
import type { ContributeKind, Listing, Place, Promo } from './types';
import { overlayStore, toastStore, type Overlay } from './ui';

/**
 * Product analytics, sent to PostHog.
 *
 * Consent comes from the cookie banner, and PostHog follows it:
 * - Before the reader answers, or after they reject analytics, PostHog runs
 *   cookieless. Nothing is written to the device and readers are counted with
 *   a daily server-side hash, which is the "basic usage data, collected
 *   without identifying you" the privacy policy describes.
 * - Once the reader turns analytics on, PostHog keeps an anonymous ID in
 *   storage, so visits, funnels and session replays join up across pages.
 * Readers are never identified by email or name, as the cookie policy says.
 *
 * Without VITE_POSTHOG_KEY, as in tests and local work without a key, every
 * function here does nothing.
 */

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const REGION = import.meta.env.VITE_POSTHOG_REGION === 'eu' ? 'eu' : 'us';

/**
 * Events go to /ingest on our own domain and are forwarded to PostHog by the
 * Vite dev server and by the Vercel rewrites. Ad blockers drop requests to
 * posthog.com, and a fifth or more of readers run one.
 */
const API_HOST = '/ingest';

/** The attribute PostHog's autocapture already reads off clicked elements. */
const PREFIX = 'data-ph-capture-attribute-';

export type ItemKind = Listing['kind'] | 'place' | 'promo';

// A type, not an interface, so it also fits context()'s plain record.
export type ItemRef = {
  item_kind: ItemKind;
  item_id: string;
  item_title: string;
  item_category: string;
};

type Placement<T extends string> = { placement: T };
type None = Record<string, never>;

/**
 * Every custom event membrs sends, with its properties. Pageviews, clicks,
 * rage clicks, copies, scroll depth, web vitals and errors are captured by
 * PostHog itself and are not listed here.
 */
export interface Events {
  // Getting around.
  nav_clicked: { item: string } & Placement<'header' | 'tab_bar' | 'footer'>;
  logo_clicked: Placement<'header' | 'header_docked' | 'footer'>;
  search_opened: Placement<'header' | 'tab_bar'>;
  see_all_clicked: { label: string; href: string };
  breadcrumb_clicked: { label: string; href: string; depth: number };
  back_clicked: None;
  section_viewed: { area: string };
  outbound_link_clicked: {
    url: string;
    destination: string;
    scheme: string;
    label: string;
  };
  toast_shown: { text: string };
  overlay_opened: { overlay: string };
  overlay_closed: { overlay: string; seconds_open: number };
  modal_closed: { modal: string; method: 'escape' | 'backdrop' | 'button' };
  image_failed: { photo: string };

  // Preferences kept on the device.
  theme_changed: { theme: string; previous: string };
  city_changed: { city: string; previous: string };

  // Accounts and the Sunday Digest.
  sign_in_started: {
    provider: string;
    mode: 'up' | 'in';
  } & Placement<'auth_modal' | 'footer'>;
  signed_in: { provider: string };
  signed_out: None;
  auth_mode_switched: { mode: 'up' | 'in' };
  digest_opened: Placement<string>;
  preferences_section_opened: { section: string };
  preferences_city_picked: { city: string };
  interest_toggled: { interest: string; selected: boolean };
  follow_up_answered: { interest: string; answer: string; selected: boolean };
  digest_save_blocked: { missing: string[] };
  digest_saved: {
    city: string;
    interests: string[];
    interests_count: number;
    first_time: boolean;
  };
  digest_skipped: { first_time: boolean };

  // Cookie consent.
  cookie_consent_updated: {
    analytics: boolean;
    marketing: boolean;
    method: 'accept_all' | 'reject_optional' | 'save_choices';
  } & Placement<'banner' | 'settings'>;
  cookie_toggle_changed: { category: string; on: boolean };

  // Finding things.
  item_opened: ItemRef & {
    component: 'card' | 'row' | 'hero' | 'most_popular' | 'deadline_row';
    position?: number;
  };
  hero_slide_selected: { index: number; item_id: string };
  category_clicked: { category: string; section: string };
  tab_changed: { tabs: string; value: string; label: string };
  range_changed: { range: string };
  filter_changed: { filter: string; value: string; label: string };
  filters_opened: None;
  filters_cleared: None;
  page_changed: {
    page: number;
    pages: number;
    method: 'number' | 'previous' | 'next';
  };
  view_more_clicked: { view: string; hidden: number };
  picker_opened: { section: string };
  picker_option_selected: {
    section: string;
    view: string | null;
    type: string | null;
  };
  search_submitted: {
    query: string;
    results: number;
    source: 'form' | 'suggestion';
  };

  // On a listing, place or promo.
  listing_cta_clicked: ItemRef & { cta: string };
  item_shared: ItemRef & { method: 'share_sheet' | 'copied' };
  find_similar_clicked: ItemRef;
  promo_code_copied: ItemRef & { code: string };

  // Onboarding.
  tour_step_viewed: { step: number; total: number; target: string };
  tour_back: { step: number };
  tour_skipped: { step: number; total: number };
  tour_completed: { total: number };

  // Contributing and ads.
  contribute_kind_switched: { from: ContributeKind; to: ContributeKind };
  contribute_started: { kind: ContributeKind };
  contribute_field_filled: { kind: ContributeKind; field: string };
  contribute_photo_added: { kind: ContributeKind };
  contribute_validation_failed: { kind: ContributeKind; fields: string[] };
  contribute_submitted: {
    kind: ContributeKind;
    category: string | null;
    city: string | null;
    has_photo: boolean;
  };
  ad_run_length_changed: { placement: string; days: number; custom: boolean };
  ad_policy_toggled: { agreed: boolean };
  ad_checkout_started: {
    placement: string;
    days: number;
    total: number;
    demo: boolean;
  };
  ad_checkout_finished: {
    placement: string;
    days: number;
    total: number;
    demo: boolean;
    status: 'completed' | 'closed' | 'failed' | 'expired' | 'cancelled';
  };
  ad_checkout_errored: { placement: string; days: number; total: number };
  ad_create_another_clicked: None;
}

export type EventName = keyof Events;

let client: PostHog | null = null;
/** Events sent before PostHog has loaded. Null while analytics is off. */
let queue: [string, Properties, Date][] | null = null;
let currentRoute: Route = { page: 'home' };

/**
 * Send one event. Pass the element the reader acted on and the event picks
 * up the area and item it sits in, from the same attributes autocapture uses.
 */
export function track<E extends EventName>(
  event: E,
  props: Events[E],
  from?: Element | null,
): void {
  send(event, { ...contextOf(from), ...props });
}

function send(event: string, properties: Properties): void {
  const props = { route: currentRoute.page, ...properties };
  if (client) client.capture(event, props);
  else if (queue && queue.length < 200) queue.push([event, props, new Date()]);
}

/** Name a region of the page. Clicks inside it, tracked or autocaptured, carry it. */
export function area(name: string): {
  'data-ph-capture-attribute-area': string;
} {
  return { 'data-ph-capture-attribute-area': name };
}

/** Attach properties to every event that starts inside an element. */
export function context(
  props: Record<string, string | number | null | undefined>,
): Record<`data-ph-capture-attribute-${string}`, string> {
  const out: Record<`data-ph-capture-attribute-${string}`, string> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value !== null && value !== undefined && value !== '')
      out[`${PREFIX}${key}`] = String(value);
  }
  return out;
}

/** The capture attributes on an element and its ancestors; the nearest wins. */
export function contextOf(el: Element | null | undefined): Properties {
  const out: Properties = {};
  for (let node = el ?? null; node; node = node.parentElement) {
    for (const attr of Array.from(node.attributes)) {
      if (!attr.name.startsWith(PREFIX) || !attr.value) continue;
      const key = attr.name.slice(PREFIX.length);
      if (!(key in out)) out[key] = attr.value;
    }
  }
  return out;
}

export const itemRef = {
  listing: (l: Listing): ItemRef => ({
    item_kind: l.kind,
    item_id: l.id,
    item_title: l.title,
    item_category: l.category,
  }),
  place: (p: Place): ItemRef => ({
    item_kind: 'place',
    item_id: p.id,
    item_title: p.name,
    item_category: p.type,
  }),
  promo: (p: Promo): ItemRef => ({
    item_kind: 'promo',
    item_id: p.id,
    item_title: p.title,
    item_category: p.category,
  }),
};

const ITEM_LINKS =
  'a[href^="/listing/"], a[href^="/place/"], a[href^="/promo/"]';

/**
 * Where a card sits among the visible cards of its area, from 1. Hidden
 * copies (the phone rail on web, and the other way round) are skipped.
 */
export function positionOf(link: Element): number | undefined {
  const scope = link.closest(`[${PREFIX}area]`);
  if (!scope) return undefined;
  const visible = Array.from(scope.querySelectorAll(ITEM_LINKS)).filter(
    (a) => a.getClientRects().length > 0,
  );
  const index = visible.indexOf(link);
  return index === -1 ? undefined : index + 1;
}

/** A click on a card or row that opens a listing, place or promo. */
export function trackItemOpened(
  link: Element,
  item: ItemRef,
  component: Events['item_opened']['component'],
): void {
  track(
    'item_opened',
    { ...item, component, position: positionOf(link) },
    link,
  );
}

export type Consent = 'granted' | 'denied' | 'pending';

/** What the cookie banner says about analytics, as PostHog's consent state. */
export function consentFor(
  choice: CookieChoice | null,
  now = Date.now(),
): Consent {
  if (!choice || !isChoiceCurrent(choice, now)) return 'pending';
  return choice.analytics ? 'granted' : 'denied';
}

function applyConsent(ph: PostHog): void {
  const want = consentFor(cookieStore.get());
  if (ph.get_explicit_consent_status() === want) return;
  if (want === 'granted') ph.opt_in_capturing({ captureEventName: null });
  else if (want === 'denied') ph.opt_out_capturing();
  else ph.clear_opt_in_out_capturing();
}

/** The parts of a route worth slicing pageviews by. */
export function routeProperties(route: Route): Properties {
  switch (route.page) {
    case 'feed':
    case 'categories':
      return { route: route.page, section: route.feed };
    case 'category':
      return {
        route: route.page,
        category: categoryBySlug(route.slug)?.name ?? route.slug,
      };
    case 'listing': {
      const listing = listingById(route.id);
      return {
        route: route.page,
        ...(listing ? itemRef.listing(listing) : { item_id: route.id }),
      };
    }
    case 'place': {
      const place = placeById(route.id);
      return {
        route: route.page,
        ...(place ? itemRef.place(place) : { item_id: route.id }),
      };
    }
    case 'promo': {
      const promo = promoById(route.id);
      return {
        route: route.page,
        ...(promo ? itemRef.promo(promo) : { item_id: route.id }),
      };
    }
    case 'contribute':
      return { route: route.page, contribute_kind: route.kind };
    case 'search':
      return { route: route.page, search_query: route.query };
    case 'legal':
      return { route: route.page, legal_doc: route.doc };
    default:
      return { route: route.page };
  }
}

/** Sent with every event, so any chart can be split by them. */
function liveProperties(): Properties {
  const session = sessionStore.get();
  return {
    route: currentRoute.page,
    city: cityStore.get(),
    theme: themeStore.get(),
    signed_in: Boolean(session),
    auth_provider: session?.provider ?? null,
    digest_subscribed: Boolean(subscriptionStore.get()),
    interests: interestsStore.get(),
    viewport: window.matchMedia('(min-width: 768px)').matches ? 'web' : 'phone',
    analytics_consent: consentFor(cookieStore.get()),
    data_source: API_BASE ? 'api' : 'fixtures',
  };
}

function withLiveProperties(event: CaptureResult | null): CaptureResult | null {
  // Replay snapshots are bulky and never charted, so they go as they are.
  if (event && event.event !== '$snapshot')
    event.properties = { ...liveProperties(), ...event.properties };
  return event;
}

let routeKey = '';

function pageview(navigation: 'initial' | 'link' | 'back_forward'): void {
  const route = parseRoute(window.location.pathname + window.location.search);
  const key = JSON.stringify(route);
  // Filters and paging rewrite the query string in place. They are tracked
  // as their own events, so only a change of route counts as a pageview.
  if (key === routeKey) return;
  const previous = routeKey ? currentRoute.page : null;
  routeKey = key;
  currentRoute = route;
  send('$pageview', {
    ...routeProperties(route),
    navigation,
    previous_route: previous,
  });
}

function watch<T>(store: Store<T>, onChange: (next: T, prev: T) => void) {
  let prev = store.get();
  store.subscribe(() => {
    const next = store.get();
    if (next === prev) return;
    const was = prev;
    prev = next;
    onChange(next, was);
  });
}

function watchStores(): void {
  watch(cookieStore, () => client && applyConsent(client));
  watch(themeStore, (theme, previous) =>
    send('theme_changed', { theme, previous }),
  );
  watch(cityStore, (city, previous) =>
    send('city_changed', { city, previous }),
  );
  watch(sessionStore, (session) =>
    session
      ? send('signed_in', { provider: session.provider })
      : send('signed_out', {}),
  );
  let openedAt = 0;
  watch<Overlay>(overlayStore, (next, prev) => {
    if (prev)
      send('overlay_closed', {
        overlay: prev,
        seconds_open: Math.round((Date.now() - openedAt) / 1000),
      });
    if (next) {
      openedAt = Date.now();
      send('overlay_opened', { overlay: next });
    }
  });
  watch(
    toastStore,
    (toast) => toast && send('toast_shown', { text: toast.text }),
  );
}

function labelOf(el: Element): string {
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  return (
    text ||
    el.getAttribute('aria-label') ||
    el.getAttribute('title') ||
    ''
  ).slice(0, 120);
}

/**
 * Links that leave membrs: tickets, applications, maps, calendars, merchant
 * sites, socials and email. Middle clicks count, since they open a tab too.
 */
function onLinkClick(e: MouseEvent): void {
  if (e.type === 'auxclick' && e.button !== 1) return;
  const link = (e.target as Element | null)?.closest?.('a[href]');
  if (!link) return;
  let url: URL;
  try {
    url = new URL(link.getAttribute('href') ?? '', window.location.href);
  } catch {
    return;
  }
  const scheme = url.protocol.replace(':', '');
  const web = scheme === 'http' || scheme === 'https';
  if (web && url.origin === window.location.origin) return;
  if (!web && scheme !== 'mailto' && scheme !== 'tel') return;
  send('outbound_link_clicked', {
    ...contextOf(link),
    url: url.href.slice(0, 500),
    destination: web ? url.host : url.pathname,
    scheme,
    label: labelOf(link),
  });
}

/**
 * Which named areas readers actually scroll to. An area counts once a
 * quarter of it, or half the screen's height of it, is in view. Screens mount
 * fresh on every route, so each pageview reports its own areas.
 */
function observeAreas(): void {
  if (!('IntersectionObserver' in window)) return;
  const reported = new WeakSet<Element>();
  const observed = new WeakSet<Element>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (reported.has(entry.target)) continue;
        const enough =
          entry.intersectionRatio >= 0.25 ||
          entry.intersectionRect.height >= window.innerHeight / 2;
        if (!entry.isIntersecting || !enough) continue;
        reported.add(entry.target);
        io.unobserve(entry.target);
        const name = entry.target.getAttribute(`${PREFIX}area`);
        if (name)
          send('section_viewed', { ...contextOf(entry.target), area: name });
      }
    },
    { threshold: [0, 0.25, 0.5] },
  );
  let scheduled = false;
  const scan = () => {
    scheduled = false;
    for (const el of document.querySelectorAll(`[${PREFIX}area]`)) {
      if (observed.has(el)) continue;
      observed.add(el);
      io.observe(el);
    }
  };
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(scan, 250);
  }).observe(document.body, { childList: true, subtree: true });
  scan();
}

/** Start analytics once, before the app renders. Safe to call without a key. */
export function initAnalytics(): void {
  if (!KEY || queue || client) return;
  queue = [];
  watchStores();
  window.addEventListener('locationchange', () => pageview('link'));
  window.addEventListener('popstate', () => pageview('back_forward'));
  document.addEventListener('click', onLinkClick, true);
  document.addEventListener('auxclick', onLinkClick, true);
  pageview('initial');
  if (document.body) observeAreas();
  else document.addEventListener('DOMContentLoaded', observeAreas);

  // The SDK loads after the first render, so it never holds up the page.
  void import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: API_HOST,
        ui_host: `https://${REGION}.posthog.com`,
        defaults: '2026-08-30',
        cookieless_mode: 'on_reject',
        // Unanswered banners count as "not yet", which cookieless mode
        // still measures. Accepting analytics switches storage on.
        opt_out_capturing_by_default: true,
        person_profiles: 'identified_only',
        capture_pageview: false,
        capture_pageleave: true,
        autocapture: { capture_copied_text: true },
        capture_dead_clicks: true,
        capture_heatmaps: true,
        capture_exceptions: true,
        capture_performance: { web_vitals: true, network_timing: true },
        session_recording: { maskAllInputs: true },
        before_send: withLiveProperties,
        loaded: () => {
          applyConsent(posthog);
          client = posthog;
          for (const [event, properties, timestamp] of queue ?? [])
            posthog.capture(event, properties, { timestamp });
          queue = [];
        },
      });
    })
    .catch(() => {
      queue = null;
    });
}
