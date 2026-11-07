import { useEffect, useLayoutEffect, useState, type FormEvent } from 'react';
import { subscribe } from '../lib/api';
import { emailError, isValidEmail } from '../lib/email';
import {
  cityStore,
  interestsStore,
  subscriptionStore,
  tourSeenStore,
} from '../lib/preferences';
import { paths } from '../lib/router';
import { useStore } from '../lib/store';
import { toast } from '../lib/ui';
import { CityChips, InterestPicker } from './InterestPicker';
import { Link } from './Link';

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

/** The total count includes the final digest step. */
const TOTAL = WEB_STEPS.length + 1;

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
 * home page people miss, then a large centred step to set up the Sunday
 * Digest, because that is the main thing membrs offers.
 */
export function OnboardingTour() {
  const seen = useStore(tourSeenStore);
  const phone = useIsPhone();
  const [index, setIndex] = useState(0);
  const steps = phone ? PHONE_STEPS : WEB_STEPS;
  const done = () => tourSeenStore.set(true);
  const subscribed = useStore(subscriptionStore);
  // Readers who set their digest while signing up skip the digest step.
  const finished = index >= steps.length && subscribed !== null;
  useEffect(() => {
    if (finished) tourSeenStore.set(true);
  }, [finished]);
  if (seen || finished) return null;
  if (index >= steps.length)
    return <DigestStep onBack={() => setIndex(index - 1)} onDone={done} />;
  return (
    <Spotlight
      key={`${phone}-${index}`}
      step={steps[index]!}
      number={index + 1}
      onBack={index ? () => setIndex(index - 1) : undefined}
      onNext={() => setIndex(index + 1)}
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

function DigestStep({
  onBack,
  onDone,
}: {
  onBack: () => void;
  onDone: () => void;
}) {
  const savedCity = useStore(cityStore);
  const [city, setCity] = useState(savedCity);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) return setError(emailError(email));
    await subscribe({
      email: email.trim(),
      city,
      interests: interestsStore.get(),
    });
    cityStore.set(city);
    subscriptionStore.set({ email: email.trim(), city });
    onDone();
    toast(`Subscribed for ${city}. Your first digest lands Sunday at 7 AM.`);
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-3">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Make the Sunday Digest yours"
        className="bg-panel border-line-2 relative max-h-[calc(100dvh-24px)] w-[min(640px,100%)] overflow-y-auto rounded-lg border px-5 py-6 shadow-2xl md:px-8 md:py-7"
      >
        <Progress step={TOTAL} />
        <div className="my-5 text-center">
          <h3 className="text-2xl font-bold tracking-tight md:text-3xl">
            Make the Sunday Digest Yours
          </h3>
          <p className="text-fg-3 mx-auto mt-2.5 max-w-md">
            Pick your city and what you care about. Every Sunday at 7 AM you get
            one email with only that. No spam.
          </p>
        </div>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <div
            className={`flex items-center gap-1.5 rounded-md border-[1.5px] py-1 pr-1 pl-4 ${error ? 'border-urgent' : 'border-line-2 focus-within:border-fg'}`}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="Your email address"
              aria-label="Email"
              autoComplete="email"
              className="min-w-0 flex-1 bg-transparent py-2.5 outline-none"
            />
            <button
              type="submit"
              className="bg-fg text-bg rounded-sm px-4 py-2.5 text-sm font-semibold"
            >
              Subscribe
            </button>
          </div>
          {error && (
            <p role="alert" className="text-urgent -mt-3 text-sm">
              {error}
            </p>
          )}
          <div>
            <p className="mb-2.5 text-sm font-bold">Your city</p>
            <CityChips value={city} onChange={setCity} />
          </div>
          <InterestPicker compact />
          <p className="text-fg-3 text-[13px]">
            By subscribing you agree to the digest, promotional emails and the{' '}
            <Link
              href={paths.legal('privacy')}
              onClick={onDone}
              className="text-fg underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </form>
        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={onDone}
            className="text-fg-3 px-3 py-2 text-sm font-semibold"
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-2 text-sm font-semibold"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
