import { useEffect, useRef, useState } from 'react';
import { area, track } from '../lib/analytics';
import { useDialog } from '../lib/focus';
import { chooseCity } from '../lib/location';
import { sessionStore } from '../lib/auth';
import { refreshForReader, subscribe } from '../lib/api';
import { messageOf } from '../lib/http';
import { BACKDROP_MOTION, SHEET_MOTION } from '../lib/motion';
import {
  cityStore,
  fieldsStore,
  interestsStore,
  subscriptionStore,
  themeStore,
} from '../lib/preferences';
import { useStore } from '../lib/store';
import { closeOverlay, finishDigest, toast } from '../lib/ui';
import { ReaderEmailField, useReaderEmail } from './EmailStep';
import { PreferenceAccordions } from './InterestPicker';

/**
 * The card contrasts the page: white over dark mode, near-black over light
 * mode, like the footer. Setting the opposite theme on the card flips every
 * token inside it, chips and links included.
 */
function useInverseTheme(): 'light' | 'dark' {
  return useStore(themeStore) === 'dark' ? 'light' : 'dark';
}

/**
 * City and interests, from the footer, the mail button, the settings menu or
 * the digest page. Saving subscribes the reader to the weekly email; a reader
 * the browser does not know yet gives their email here first.
 */
export function PreferencesModal() {
  const inverse = useInverseTheme();
  const account = useStore(sessionStore)?.account;
  const reader = useReaderEmail('preferences');
  const joined = useStore(subscriptionStore);
  const savedCity = useStore(cityStore);
  const [city, setCity] = useState(savedCity);
  const [open, setOpen] = useState<'city' | 'event' | 'opportunity' | 'place'>(
    savedCity ? 'event' : 'city',
  );
  const card = useRef<HTMLDivElement>(null);
  const editing = joined !== null;

  useDialog(card, closeOverlay);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    card.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  async function save() {
    if (!(await reader.ensureKnown())) return;
    const email = sessionStore.get()?.account?.email ?? account?.email ?? '';
    let delivery;
    try {
      delivery = await subscribe({
        email,
        city,
        interests: interestsStore.get(),
        fields: fieldsStore.get(),
      });
    } catch (error) {
      toast(
        messageOf(error, 'Could not save your digest. Try again in a moment.'),
      );
      return;
    }
    if (delivery === 'signedOut') {
      toast('Enter your email to save your digest.');
      return;
    }
    const interests = interestsStore.get();
    track('digest_saved', {
      city,
      interests,
      interests_count: interests.length,
      first_time: !editing,
      queued: delivery === 'queued',
    });
    chooseCity(city);
    subscriptionStore.set({ email, city });
    finishDigest();
    void refreshForReader();
    toast(
      delivery === 'queued'
        ? 'Saved on this device. We will sync it when the connection is back.'
        : editing
          ? `Saved. Your digest now follows ${city}.`
          : `All set. Your weekly email for ${city} is on its way.`,
    );
  }

  function skip() {
    track('digest_skipped', { first_time: !editing });
    closeOverlay();
    if (!editing) toast("You're in. Digest settings are in the footer.");
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-end md:place-items-center md:p-6">
      <button
        type="button"
        aria-label="Close"
        onClick={skip}
        className={`absolute inset-0 bg-black/60 backdrop-blur-md ${BACKDROP_MOTION}`}
      />
      <div
        ref={card}
        tabIndex={-1}
        data-theme={inverse}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prefs-title"
        {...area('preferences_modal')}
        className={`bg-panel text-fg relative max-h-[94dvh] w-full overflow-auto rounded-t-lg px-5 pt-8 pb-6 shadow-2xl outline-none md:w-[min(620px,100%)] md:rounded-lg md:px-10 md:pt-9 ${SHEET_MOTION}`}
      >
        <h2
          id="prefs-title"
          className="pr-8 text-center text-2xl font-semibold tracking-tight md:text-3xl"
        >
          {editing ? 'Your Picks' : 'Pick What You Care About'}
        </h2>
        <div className="mt-8">
          <PreferenceAccordions
            city={city}
            onCity={setCity}
            open={open}
            onOpen={setOpen}
          />
        </div>
        {!editing && (
          <p className="text-fg-4 mt-8 text-[13px]">
            Saving subscribes you to the weekly email and our promotional
            emails. Unsubscribe any time from any email.
          </p>
        )}
        {!reader.known && (
          <div className="mt-8">
            <ReaderEmailField value={reader.email} onChange={reader.setEmail} />
          </div>
        )}
        <div className="mt-8 flex items-center justify-between gap-3 md:justify-end">
          <button
            type="button"
            onClick={skip}
            className="text-fg-3 h-12 px-4 text-base font-semibold"
          >
            {editing ? 'Cancel' : 'Skip for now'}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={reader.busy || (!reader.known && !reader.ready)}
            className="bg-brand hover:bg-brand-hover h-12 rounded-md px-[18px] text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editing ? 'Save changes' : 'Save and continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
