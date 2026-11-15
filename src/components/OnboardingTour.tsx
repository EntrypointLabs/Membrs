import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { track } from '../lib/analytics';
import { useDialog } from '../lib/focus';
import { useIsPhone } from '../lib/media';
import { sessionStore } from '../lib/auth';
import { tourSeenStore } from '../lib/preferences';
import { useStore } from '../lib/store';
import { titleCase } from '../lib/text';
import { overlayStore, signUpPromptedStore, tourDue } from '../lib/ui';

interface Step {
  /** The data-tour value of the element to spotlight. */
  target: string;
  title: string;
  body: string;
}

const WEB_STEPS: Step[] = [
  {
    target: 'nav-events',
    title: 'Sections',
    body: 'Events and opportunities.',
  },
  {
    target: 'week',
    title: 'This week',
    body: 'Soonest first.',
  },
  {
    target: 'closing',
    title: 'Closing soon',
    body: 'Red is three days or less.',
  },
  {
    target: 'search',
    title: 'Search',
    body: 'Names, cities or categories.',
  },
];

const PHONE_STEPS: Step[] = [
  {
    target: 'city',
    title: 'Your city',
    body: 'Tap to switch.',
  },
  {
    target: 'week',
    title: 'This week',
    body: 'Soonest first.',
  },
  {
    target: 'plans',
    title: 'Your plans',
    body: 'Add to Calendar saves events to your calendar.',
  },
];

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-3 text-sm font-bold">
      <span>
        <em className="text-accent not-italic">
          {String(step).padStart(2, '0')}
        </em>
        /{String(total).padStart(2, '0')}
      </span>
      <span className="bg-soft h-0.5 flex-1 overflow-hidden rounded-full">
        <i
          className="bg-accent block h-full"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </span>
    </div>
  );
}

function targetOf(step: Step): HTMLElement | undefined {
  return [
    ...document.querySelectorAll<HTMLElement>(`[data-tour="${step.target}"]`),
  ].find((el) => el.getClientRects().length > 0);
}

function visibleSteps(steps: Step[]): Step[] {
  return steps.filter((step) => targetOf(step));
}

export function OnboardingTour() {
  useStore(tourSeenStore);
  useStore(sessionStore);
  useStore(signUpPromptedStore);
  const overlay = useStore(overlayStore);
  if (!tourDue(overlay)) return null;
  return <Tour />;
}

function Tour() {
  const phone = useIsPhone();
  const [steps, setSteps] = useState<Step[]>([]);
  useLayoutEffect(() => {
    setSteps(visibleSteps(phone ? PHONE_STEPS : WEB_STEPS));
  }, [phone]);
  if (!steps.length) return null;
  return <TourDialog key={String(phone)} steps={steps} />;
}

function TourDialog({ steps }: { steps: Step[] }) {
  const [index, setIndex] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const done = () => tourSeenStore.set(true);
  const skip = () => {
    track('tour_skipped', { step: index + 1, total: steps.length });
    done();
  };
  useDialog(box, skip);
  const step = steps[Math.min(index, steps.length - 1)]!;
  const last = index + 1 >= steps.length;
  return (
    <div ref={box} tabIndex={-1} className="outline-none">
      <Spotlight
        key={index}
        step={step}
        number={index + 1}
        total={steps.length}
        last={last}
        onBack={
          index
            ? () => {
                track('tour_back', { step: index + 1 });
                setIndex(index - 1);
              }
            : undefined
        }
        onNext={() => {
          if (!last) return setIndex(index + 1);
          track('tour_completed', { total: steps.length });
          done();
        }}
        onSkip={skip}
      />
    </div>
  );
}

function Spotlight({
  step,
  number,
  total,
  last,
  onBack,
  onNext,
  onSkip,
}: {
  step: Step;
  number: number;
  total: number;
  last: boolean;
  onBack?: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  // Each step mounts fresh (it is keyed by step), so this runs once a step.
  useEffect(() => {
    track('tour_step_viewed', { step: number, total, target: step.target });
  }, [number, total, step.target]);

  useLayoutEffect(() => {
    const el = targetOf(step);
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
  }, [step]);

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
          className="ease-in-out-strong pointer-events-none absolute rounded-md transition-[left,top,width,height] duration-250"
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
        aria-modal="true"
        aria-label="Tour"
        className="bg-panel border-line-2 absolute rounded-md border p-5 shadow-2xl"
        style={{ top, left, width: cardWidth }}
      >
        <Progress step={number} total={total} />
        <h3 className="mt-4 mb-1.5 text-[17px] font-bold tracking-tight">
          {titleCase(step.title)}
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
              {last ? 'Done' : 'Next'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
