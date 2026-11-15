import { useEffect, useState } from 'react';
import {
  acceptAll,
  cookieStore,
  isChoiceCurrent,
  rejectOptional,
  saveChoice,
} from '../lib/cookies';
import { paths } from '../lib/router';
import { useStore } from '../lib/store';
import { titleCase } from '../lib/text';
import { closeOverlay, openOverlay } from '../lib/ui';
import { Link } from './Link';
import { Modal } from './Modal';

const FIELDS = 'input, textarea, select, [contenteditable="true"]';

function useTyping(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const check = () =>
      setTyping(document.activeElement?.matches(FIELDS) ?? false);
    document.addEventListener('focusin', check);
    document.addEventListener('focusout', check);
    return () => {
      document.removeEventListener('focusin', check);
      document.removeEventListener('focusout', check);
    };
  }, []);
  return typing;
}

export function CookieBanner() {
  const choice = useStore(cookieStore);
  const typing = useTyping();
  if (isChoiceCurrent(choice)) return null;
  const button = 'rounded-md px-3 py-2 text-sm font-bold md:px-4 md:py-2.5';
  return (
    <section
      aria-label="Cookie notice"
      className={`bg-inv text-inv-fg fixed right-3 bottom-[calc(84px+env(safe-area-inset-bottom,0px))] left-3 z-40 rounded-lg p-3 shadow-2xl md:right-auto md:bottom-6 md:left-6 md:w-[420px] md:p-5 ${typing ? 'max-md:hidden' : ''}`}
    >
      <h2 className="mb-1.5 hidden text-[17px] font-bold md:block">
        {titleCase('Cookies on MEMBRS')}
      </h2>
      <p className="text-inv-fg-2 text-[13px] leading-snug md:mb-4 md:text-sm">
        Essential cookies always. Analytics and marketing only with your OK.{' '}
        <Link
          href={paths.legal('cookies')}
          className="text-accent font-semibold"
        >
          Cookie Policy
        </Link>
      </p>
      <div className="mt-2.5 flex gap-2 md:mt-0 md:flex-wrap">
        <button
          type="button"
          onClick={rejectOptional}
          className={`border-inv-line flex-1 border ${button}`}
        >
          <span className="md:hidden">Reject</span>
          <span className="hidden md:inline">Reject optional</span>
        </button>
        <button
          type="button"
          onClick={acceptAll}
          className={`bg-inv-fg text-inv flex-1 ${button}`}
        >
          <span className="md:hidden">Accept</span>
          <span className="hidden md:inline">Accept all</span>
        </button>
        <button
          type="button"
          onClick={() => openOverlay('cookies')}
          className="text-inv-fg-3 px-3 py-2 text-sm font-semibold md:w-full md:px-0 md:py-0 md:pt-1"
        >
          <span className="md:hidden">Manage</span>
          <span className="hidden md:inline">Manage preferences</span>
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
      <Switch
        label="Essential"
        detail="Keep MEMBRS working: your city, theme, sign-in and security. Always on."
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
        detail="Measure our own campaigns on other sites. Advertisers on MEMBRS never track you."
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
