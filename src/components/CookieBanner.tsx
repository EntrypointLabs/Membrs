import { useState } from 'react';
import {
  acceptAll,
  cookieStore,
  isChoiceCurrent,
  rejectOptional,
  saveChoice,
} from '../lib/cookies';
import { paths } from '../lib/router';
import { useStore } from '../lib/store';
import { closeOverlay, openOverlay } from '../lib/ui';
import { Link } from './Link';
import { Modal } from './Modal';

/**
 * The first-visit cookie notice. Only essential cookies run until the reader
 * answers; it stays answered for twelve months.
 */
export function CookieBanner() {
  const choice = useStore(cookieStore);
  if (isChoiceCurrent(choice)) return null;
  return (
    <section
      aria-label="Cookie notice"
      className="bg-inv text-inv-fg fixed right-3 bottom-[calc(84px+env(safe-area-inset-bottom,0px))] left-3 z-40 rounded-lg p-5 shadow-2xl md:right-auto md:bottom-6 md:left-6 md:w-[420px]"
    >
      <h2 className="mb-1.5 text-[17px] font-bold">Cookies on membrs</h2>
      <p className="text-inv-fg-2 mb-4 text-sm leading-relaxed">
        We use essential cookies to make membrs work. With your OK we also use
        analytics and marketing cookies to improve it. Read our{' '}
        <Link
          href={paths.legal('cookies')}
          className="text-accent font-semibold"
        >
          Cookie Policy
        </Link>
        .
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={rejectOptional}
          className="border-inv-line flex-1 rounded-md border px-4 py-2.5 text-sm font-bold"
        >
          Reject optional
        </button>
        <button
          type="button"
          onClick={acceptAll}
          className="bg-inv-fg text-inv flex-1 rounded-md px-4 py-2.5 text-sm font-bold"
        >
          Accept all
        </button>
        <button
          type="button"
          onClick={() => openOverlay('cookies')}
          className="text-inv-fg-3 w-full pt-1 text-sm font-semibold"
        >
          Manage preferences
        </button>
      </div>
    </section>
  );
}

function Switch({
  label,
  detail,
  on,
  locked = false,
  onChange,
}: {
  label: string;
  detail: string;
  on: boolean;
  locked?: boolean;
  onChange?: (on: boolean) => void;
}) {
  return (
    <div className="border-line flex items-start justify-between gap-5 border-t py-4 first:border-t-0">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-fg-3 text-sm">{detail}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={locked}
        onClick={() => onChange?.(!on)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-55 ${on ? 'bg-brand' : 'bg-soft-hover'}`}
      >
        <span
          className={`absolute top-[3px] left-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  );
}

/** Cookie settings: essential always on, analytics and marketing opt-in. */
export function CookieSettings() {
  const choice = useStore(cookieStore);
  const [analytics, setAnalytics] = useState(choice?.analytics ?? false);
  const [marketing, setMarketing] = useState(choice?.marketing ?? false);
  return (
    <Modal title="Cookie settings" onClose={closeOverlay}>
      <p className="text-fg-3 mb-2 text-sm">
        Choose which cookies membrs can use. You can change this any time from
        the footer.
      </p>
      <Switch
        label="Essential"
        detail="Keep membrs working: your city, theme, saved items and security. Always on."
        on
        locked
      />
      <Switch
        label="Analytics"
        detail="Aggregated stats on which pages and listings are useful. Never used for ads."
        on={analytics}
        onChange={setAnalytics}
      />
      <Switch
        label="Marketing"
        detail="Measure our own campaigns on other sites. Advertisers on membrs never track you."
        on={marketing}
        onChange={setMarketing}
      />
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => {
            rejectOptional();
            closeOverlay();
          }}
          className="border-line-2 flex-1 rounded-md border py-3 font-bold"
        >
          Reject optional
        </button>
        <button
          type="button"
          onClick={() => {
            saveChoice(analytics, marketing);
            closeOverlay();
          }}
          className="bg-fg text-bg flex-1 rounded-md py-3 font-bold"
        >
          Save choices
        </button>
      </div>
    </Modal>
  );
}
