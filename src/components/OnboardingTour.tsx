import { useEffect, useLayoutEffect, useState } from 'react';
import { subscriptionStore, tourSeenStore } from '../lib/preferences';
import { useStore } from '../lib/store';
import { openDigest } from '../lib/ui';

interface Step {
  /** The data-tour value of the element to spotlight. */
  target: string;
  title: string;
  body: string;
}

const WEB_STEPS: Step[] = [
  {
    target: 'nav-events',
    title: 'Every section, one tap away',
    body: 'Events, opportunities, places and promos each have their own page. Pick one to browse everything in it.',
  },
  {
    target: 'week',
    title: 'This week, already sorted',
    body: 'The soonest things to do sit right here, with the date, place and price on every card. Tap one for the full details.',
  },
  {
    target: 'closing',
    title: "Deadlines you'd otherwise miss",
    body: 'Grants, fellowships and calls closing soon, nearest first. Red means three days or less.',
  },
  {
    target: 'search',
    title: 'Search anything',
    body: 'Type a name, a city or a vibe. Filters and budget live inside search too.',
  },
];

const PHONE_STEPS: Step[] = [
  {
    target: 'city',
    title: 'Your city comes first',
    body: 'Everything is filtered to where you are. Tap here to switch cities anytime.',
  },
  {
    target: 'week',
    title: 'This week, already sorted',
    body: "Swipe through what's on soonest. Date, place and price are on every card.",
  },
  {
    target: 'closing',
    title: "Deadlines you'd otherwise miss",
    body: 'Opportunities closing soon, nearest first. The tag shows how many days are left.',
  },
  {
    target: 'plans',
    title: 'Your plans in one place',
    body: 'Anything you add to your calendar or set a reminder for shows up here.',
  },
];

const TOTAL = WEB_STEPS.length;

function useIsPhone(): boolean {
  const query = '(max-width: 760px)';
  const [phone, setPhone] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return phone;
}

function Progress({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-3 text-sm font-bold">
      <span>
        <em className="text-accent not-italic">
          {String(step).padStart(2, '0')}
        </em>
        /{String(TOTAL).padStart(2, '0')}
      </span>
      <span className="bg-soft h-0.5 flex-1 overflow-hidden rounded-full">
        <i
          className="bg-accent block h-full"
          style={{ width: `${(step / TOTAL) * 100}%` }}
        />
      </span>
    </div>
  );
}

/**
 * First-visit onboarding: four spotlight steps that point at the parts of the
 * home page people miss, then straight into the Sunday Digest, because that
 * is the main thing membrs offers.
 */
export function OnboardingTour() {
  const seen = useStore(tourSeenStore);
  const phone = useIsPhone();
  const [index, setIndex] = useState(0);
  const steps = phone ? PHONE_STEPS : WEB_STEPS;
  const done = () => tourSeenStore.set(true);
  // The tour ends where every digest entry point ends: the sign-up card, or
  // the city and interests step for readers who already have an account.
  // Readers who already get the digest just finish.
  const finish = () => {
    done();
    if (!subscriptionStore.get()) openDigest();
  };
  if (seen) return null;
  return (
    <Spotlight
      key={`${phone}-${index}`}
      step={steps[index]!}
      number={index + 1}
      onBack={index ? () => setIndex(index - 1) : undefined}
      onNext={() =>
        index + 1 >= steps.length ? finish() : setIndex(index + 1)
      }
      onSkip={done}
    />
  );
}

function Spotlight({
  step,
  number,
  onBack,
  onNext,
  onSkip,
}: {
  step: Step;
  number: number;
  onBack?: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>(
      `[data-tour="${step.target}"]`,
    );
    if (!el) return;
    // Scroll the page, never a rail: scrollIntoView would also slide a
    // horizontal rail and hide its first card.
    const box = el.getBoundingClientRect();
    window.scrollBy({
      top: box.top - (window.innerHeight - box.height) / 2,
      behavior: 'instant',
    });
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [step.target]);

  const pad = 6;
  const cardWidth = Math.min(340, window.innerWidth - 24);
  const below = rect ? rect.bottom + 220 < window.innerHeight : true;
  const top = rect
    ? below
      ? rect.bottom + pad + 14
      : Math.max(12, rect.top - pad - 14 - 200)
    : window.innerHeight / 2 - 100;
  const left = rect
    ? Math.max(
        12,
        Math.min(
          rect.left + rect.width / 2 - cardWidth / 2,
          window.innerWidth - cardWidth - 12,
        ),
      )
    : (window.innerWidth - cardWidth) / 2;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0" />
      {rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-md transition-all duration-300"
          style={{
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.62)',
          }}
        />
      )}
      <div
        role="dialog"
        aria-label="Tour"
        className="bg-panel border-line-2 absolute rounded-md border p-5 shadow-2xl"
        style={{ top, left, width: cardWidth }}
      >
        <Progress step={number} />
        <h3 className="mt-4 mb-1.5 text-[17px] font-bold tracking-tight">
          {step.title}
        </h3>
        <p className="text-fg-3 text-[14.5px] leading-snug">{step.body}</p>
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={onSkip}
            className="text-fg-3 text-sm font-semibold"
          >
            Skip tour
          </button>
          <span className="flex gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="bg-btn rounded-sm px-4 py-2 text-sm font-semibold"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              className="bg-fg text-bg rounded-sm px-4 py-2 text-sm font-semibold"
            >
              Next
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
