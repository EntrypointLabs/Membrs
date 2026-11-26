import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { XIcon } from 'lucide-react';
import { track } from '../lib/analytics';
import { catalogueStore, listings, refreshForReader } from '../lib/api';
import { useDialog } from '../lib/focus';
import { locationChoiceStore, shareLocation } from '../lib/location';
import { useIsPhone } from '../lib/media';
import { sessionStore } from '../lib/auth';
import { cityStore, tourSeenStore } from '../lib/preferences';
import { useStore } from '../lib/store';
import { titleCase } from '../lib/text';
import { overlayStore, tourDue } from '../lib/ui';
import { cn } from '../lib/utils';

const PAD = 6;
const GAP = 12;
const EDGE = 16;
const TAB_BAR = 72;
const ARROW_INSET = 20;
const WEB_CARD_WIDTH = 320;
const CARD_ESTIMATE = 150;

interface Step {
  /** The data-tour value of the element to spotlight. */
  target?: string;
  title: string;
  /** Left out on the location step, whose text names the reader's own place. */
  body?: string;
  locate?: boolean;
}

const LOCATION_STEP: Step = {
  title: 'Your location',
  locate: true,
};

const WEB_STEPS: Step[] = [
  LOCATION_STEP,
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
  LOCATION_STEP,
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
    <div className="flex items-center gap-3 text-xs font-bold tabular-nums">
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
  if (!step.target) return undefined;
  return [
    ...document.querySelectorAll<HTMLElement>(`[data-tour="${step.target}"]`),
  ].find((el) => el.getClientRects().length > 0);
}

function visibleSteps(steps: Step[]): Step[] {
  return steps.filter((step) =>
    step.locate
      ? locationChoiceStore.get() === 'unasked'
      : Boolean(targetOf(step)),
  );
}

export function OnboardingTour() {
  useStore(tourSeenStore);
  useStore(sessionStore);
  const overlay = useStore(overlayStore);
  const { status } = useStore(catalogueStore);
  // The tour points at shelves, so it waits for a catalogue that has some.
  if (status !== 'ready' || !listings().length || !tourDue(overlay))
    return null;
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
  const done = () => {
    tourSeenStore.set(true);
    void refreshForReader();
  };
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
  const city = useStore(cityStore);
  // Each step mounts fresh (it is keyed by step), so this runs once a step.
  useEffect(() => {
    track('tour_step_viewed', {
      step: number,
      total,
      target: step.target ?? (step.locate ? 'location' : 'page'),
    });
  }, [number, total, step.target, step.locate]);

  const phone = useIsPhone();
  const bottomEdge = phone ? TAB_BAR + EDGE : EDGE;
  useLayoutEffect(() => {
    const el = targetOf(step);
    if (!el) return;
    const box = el.getBoundingClientRect();
    const spare =
      window.innerHeight -
      bottomEdge -
      EDGE -
      box.height -
      PAD * 2 -
      CARD_ESTIMATE -
      GAP;
    const landing =
      spare >= 0 ? EDGE + PAD + spare / 2 : EDGE + CARD_ESTIMATE + GAP + PAD;
    window.scrollBy({ top: box.top - landing, behavior: 'instant' });
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [step, bottomEdge]);

  const card = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(CARD_ESTIMATE);
  useLayoutEffect(() => {
    if (card.current) setCardHeight(card.current.offsetHeight);
  }, [rect, step, phone]);

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const cardWidth = phone
    ? viewportWidth - EDGE * 2
    : Math.min(WEB_CARD_WIDTH, viewportWidth - EDGE * 2);
  const ring = rect && {
    top: rect.top - PAD,
    bottom: rect.bottom + PAD,
    centre: rect.left + rect.width / 2,
  };
  const spaceBelow = ring ? viewportHeight - bottomEdge - ring.bottom - GAP : 0;
  const spaceAbove = ring ? ring.top - GAP - EDGE : 0;
  const below = ring
    ? spaceBelow >= cardHeight || spaceBelow >= spaceAbove
    : false;
  const top = ring
    ? Math.min(
        Math.max(EDGE, below ? ring.bottom + GAP : ring.top - GAP - cardHeight),
        viewportHeight - bottomEdge - cardHeight,
      )
    : (viewportHeight - cardHeight) / 2;
  const left = ring
    ? Math.min(
        Math.max(EDGE, ring.centre - cardWidth / 2),
        viewportWidth - cardWidth - EDGE,
      )
    : (viewportWidth - cardWidth) / 2;
  const arrowLeft = ring
    ? Math.min(
        Math.max(ARROW_INSET, ring.centre - left),
        cardWidth - ARROW_INSET,
      )
    : null;
  const pointsAtTarget =
    ring !== null &&
    (below ? top >= ring.bottom : top + cardHeight <= ring.top);

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0" />
      {rect && (
        <div
          aria-hidden="true"
          className="ease-in-out-strong pointer-events-none absolute rounded-md transition-[left,top,width,height] duration-250"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.62)',
          }}
        />
      )}
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-label="Tour"
        className="bg-panel border-line-2 absolute rounded-md border p-4 shadow-2xl"
        style={{ top, left, width: cardWidth }}
      >
        {pointsAtTarget && arrowLeft !== null && (
          <span
            aria-hidden="true"
            className={cn(
              'bg-panel border-line-2 absolute size-3 -translate-x-1/2 rotate-45',
              below
                ? '-top-1.5 border-t border-l'
                : '-bottom-1.5 border-r border-b',
            )}
            style={{ left: arrowLeft }}
          />
        )}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <Progress step={number} total={total} />
          </div>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Skip tour"
            className="text-fg-3 hover:text-fg hover:bg-btn -m-1.5 grid size-8 shrink-0 place-items-center rounded-sm"
          >
            <XIcon className="size-4" />
          </button>
        </div>
        <h3 className="mt-3 text-base font-bold tracking-tight">
          {titleCase(step.title)}
        </h3>
        <p className="text-fg-3 mt-1 text-sm leading-snug">
          {step.locate
            ? `You are seeing ${city}. Share your location to see what is closest to you instead.`
            : step.body}
        </p>
        <div className="mt-4 flex justify-end">
          <span
            className={
              step.locate ? 'grid w-full grid-cols-2 gap-2' : 'flex gap-2'
            }
          >
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="bg-btn h-9 rounded-sm px-3.5 text-[13px] font-semibold"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (step.locate) void shareLocation();
                onNext();
              }}
              className="bg-fg text-bg h-9 rounded-sm px-3.5 text-[13px] font-semibold"
            >
              {step.locate ? 'Use my location' : last ? 'Done' : 'Next'}
            </button>
            {step.locate && (
              <button
                type="button"
                onClick={onNext}
                className="bg-btn h-9 rounded-sm px-3.5 text-[13px] font-semibold"
              >
                Not now
              </button>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
