import { useState } from 'react';
import { signIn, sessionStore, type Provider } from '../lib/auth';
import { subscriptionStore } from '../lib/preferences';
import { useStore } from '../lib/store';
import { openDigest, openOverlay } from '../lib/ui';
import { ProviderButton } from './AuthModal';
import { Icon } from './Icon';

/**
 * The footer's digest block. It mirrors the sign-up card instead of asking
 * for an email, because the digest belongs to an account: signed out, it is
 * the Google and Apple buttons; signed in without a digest, one button to
 * pick a city and interests; subscribed, a status line with Edit.
 */
export function DigestForm() {
  const session = useStore(sessionStore);
  const joined = useStore(subscriptionStore);
  const [busy, setBusy] = useState<Provider | null>(null);

  async function go(provider: Provider) {
    setBusy(provider);
    await signIn(provider);
    setBusy(null);
    openOverlay('prefs');
  }

  const settings = (
    <button
      type="button"
      onClick={openDigest}
      aria-label="Edit your city and interests"
      title="Edit your city and interests"
      className="border-inv-fg-3 hover:border-brand hover:bg-brand grid h-[50px] w-[52px] shrink-0 place-items-center rounded-md border-[1.5px] transition-colors hover:text-white"
    >
      <Icon name="settings" className="h-5 w-5" />
    </button>
  );

  if (joined)
    return (
      <div className="flex items-center gap-4">
        <p className="text-inv-fg flex flex-1 items-center gap-2.5 text-[17px]">
          <Icon name="check" className="text-open h-5 w-5 shrink-0" />
          <span>
            You get the Sunday Digest for <b>{joined.city}</b>.
          </span>
        </p>
        {settings}
      </div>
    );

  if (session)
    return (
      <div>
        <button
          type="button"
          onClick={openDigest}
          className="bg-brand hover:bg-brand-hover h-[50px] w-full rounded-md px-5 text-[15px] font-bold text-white"
        >
          Choose your city and interests
        </button>
        <p className="text-inv-fg-2 mt-3 text-sm">
          One step left. It takes ten seconds.
        </p>
      </div>
    );

  return (
    <div>
      <div className="grid max-w-[400px] gap-2.5">
        <ProviderButton
          provider="google"
          busy={busy}
          onClick={() => go('google')}
        />
        <ProviderButton
          provider="apple"
          busy={busy}
          onClick={() => go('apple')}
        />
      </div>
      <p className="text-inv-fg-2 mt-3 text-sm">
        Free. No password to remember. Unsubscribe anytime.
      </p>
    </div>
  );
}
