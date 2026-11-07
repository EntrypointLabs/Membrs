import { useState, type FormEvent } from 'react';
import { subscribe } from '../lib/api';
import { emailError, isValidEmail } from '../lib/email';
import {
  cityStore,
  interestsStore,
  subscriptionStore,
} from '../lib/preferences';
import { useStore } from '../lib/store';
import { openOverlay, toast } from '../lib/ui';
import { Icon } from './Icon';

/**
 * The one-line digest signup: an outlined email box with Subscribe inside
 * it, and a separate settings button beside it that opens the full city and
 * interests picker. Used in the footer; the picker itself is DigestModal.
 */
export function DigestForm({
  tone = 'inverse',
}: {
  tone?: 'inverse' | 'page';
}) {
  const city = useStore(cityStore);
  const joined = useStore(subscriptionStore);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const inv = tone === 'inverse';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError(emailError(email));
      return;
    }
    await subscribe({
      email: email.trim(),
      city,
      interests: interestsStore.get(),
    });
    subscriptionStore.set({ email: email.trim(), city });
    toast(`Subscribed for ${city}. Your first digest lands Sunday at 7 AM.`);
  }

  if (joined) {
    return (
      <p
        className={`flex items-center gap-2 ${inv ? 'text-inv-fg' : 'text-fg'}`}
      >
        <Icon name="check" className="text-open h-5 w-5" />
        You get the Sunday digest for <b>{joined.city}</b>.
        <button
          type="button"
          onClick={() => openOverlay('digest')}
          className="text-brand font-semibold"
        >
          Edit
        </button>
      </p>
    );
  }

  const line = inv ? 'border-inv-fg-3' : 'border-line-2';
  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="flex items-stretch gap-2.5">
        <div
          className={`flex flex-1 items-center gap-2 rounded-md border-[1.5px] py-1 pr-1 pl-4 ${
            error ? 'border-urgent' : line
          }`}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="Your email address"
            autoComplete="email"
            aria-label="Email"
            aria-invalid={Boolean(error)}
            className={`min-w-0 flex-1 bg-transparent py-2 text-base outline-none ${
              inv
                ? 'text-inv-fg placeholder:text-inv-fg-3'
                : 'placeholder:text-fg-4'
            }`}
          />
          <button
            type="submit"
            className={`shrink-0 rounded-[10px] px-4 py-2 text-[15px] font-semibold ${
              inv ? 'bg-inv-fg text-inv' : 'bg-fg text-bg'
            }`}
          >
            Subscribe
          </button>
        </div>
        <button
          type="button"
          onClick={() => openOverlay('digest')}
          aria-label="Choose your city and interests"
          title="Choose your city and interests"
          className={`hover:border-brand hover:bg-brand grid w-[52px] shrink-0 place-items-center rounded-md border-[1.5px] transition-colors hover:text-white ${line}`}
        >
          <Icon name="settings" className="h-5 w-5" />
        </button>
      </div>
      <p
        role={error ? 'alert' : undefined}
        className={`mt-3 text-sm ${error ? 'text-urgent' : inv ? 'text-inv-fg-2' : 'text-fg-3'}`}
      >
        {error || 'No spam. Unsubscribe anytime.'}
      </p>
    </form>
  );
}
