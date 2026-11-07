import { useEffect, useRef, useState } from 'react';
import { PROVIDER_NAME, signIn, type Provider } from '../lib/auth';
import { paths } from '../lib/router';
import { closeOverlay, toast } from '../lib/ui';
import { Icon } from './Icon';
import { Link } from './Link';
import { Photo } from './Photo';

export type AuthMode = 'up' | 'in';

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A11.9 11.9 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"
      />
    </svg>
  );
}

export function AppleMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      className={className}
    >
      <path d="M16.37 12.73c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.27-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.39-.92-2.41-3.66zM14.1 5.98c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.1 1.76-.96 2.8 1.01.08 2.05-.52 2.68-1.28z" />
    </svg>
  );
}

/**
 * Create an account or sign in, with Google or Apple and nothing else. A photo
 * panel on the left, the two buttons on the right; a bottom sheet on phones.
 */
export function AuthModal({ initialMode = 'up' }: { initialMode?: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [busy, setBusy] = useState<Provider | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const up = mode === 'up';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeOverlay();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    card.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  async function go(provider: Provider) {
    setBusy(provider);
    await signIn(provider);
    closeOverlay();
    toast(
      up
        ? `Account created with ${PROVIDER_NAME[provider]}. Welcome to MEMBRS.`
        : `Signed in with ${PROVIDER_NAME[provider]}.`,
    );
  }

  const button = (provider: Provider) => (
    <button
      type="button"
      onClick={() => go(provider)}
      disabled={busy !== null}
      className={`flex h-[54px] items-center justify-center gap-3 rounded-md border text-base font-semibold transition hover:-translate-y-px disabled:cursor-progress disabled:opacity-75 disabled:hover:translate-y-0 ${
        provider === 'google'
          ? 'border-black/10 bg-white text-[#1f1f1f]'
          : 'border-white/10 bg-[#1c1c1e] text-white'
      }`}
    >
      {busy === provider ? (
        <i className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : provider === 'google' ? (
        <GoogleMark />
      ) : (
        <AppleMark />
      )}
      {busy === provider
        ? `Connecting to ${PROVIDER_NAME[provider]}…`
        : `Continue with ${PROVIDER_NAME[provider]}`}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[80] grid place-items-end md:place-items-center md:p-6">
      <button
        type="button"
        aria-label="Close"
        onClick={closeOverlay}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      <div
        ref={card}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="relative grid max-h-[94dvh] w-full overflow-auto rounded-t-lg bg-[#050505] p-2.5 text-[#f5f5f6] shadow-2xl outline-none focus-visible:outline-none md:min-h-[min(600px,calc(100vh-48px))] md:w-[min(1040px,100%)] md:grid-cols-2 md:rounded-lg md:p-3"
      >
        <div className="relative min-h-[220px] overflow-hidden rounded-md">
          <Photo
            id="p1"
            alt="Friends at a live event"
            className="absolute inset-0 h-full w-full"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-6 px-5 text-center text-white md:bottom-11 md:px-8">
            <p className="text-[17px] leading-snug font-medium tracking-tight md:text-[clamp(19px,1.6vw,23px)]">
              {up
                ? 'Every Sunday, the best of your city.'
                : "Welcome back to the city's best."}
              <br />
              {up
                ? 'Join the people who never miss what matters.'
                : 'Your picks and plans are where you left them.'}
            </p>
            <p className="mt-2 text-[13px] text-white/65 md:mt-3.5 md:text-sm">
              MEMBRS · Events, opportunities, places and promos
            </p>
          </div>
        </div>
        <div className="relative grid place-items-center px-3.5 py-7 md:px-[clamp(28px,5vw,72px)] md:py-12">
          <button
            type="button"
            onClick={closeOverlay}
            aria-label="Close"
            className="absolute top-[-218px] right-1.5 grid h-[38px] w-[38px] place-items-center rounded-md bg-black/45 text-white backdrop-blur md:top-2 md:right-2 md:bg-transparent md:opacity-60 md:hover:opacity-100"
          >
            <Icon name="x" className="h-[18px] w-[18px]" />
          </button>
          <div className="w-full max-w-[380px]">
            <h2
              id="auth-title"
              className="text-2xl font-semibold tracking-tight md:text-3xl"
            >
              {up ? 'Create Your Account' : 'Sign In to MEMBRS'}
            </h2>
            <p className="mt-3 mb-6 text-[15px] text-white/55 md:mb-9">
              {up
                ? 'Save listings, set reminders and tune your Sunday digest. One tap, no password to remember.'
                : 'Pick the account you joined with. We never see or store a password.'}
            </p>
            <div className="grid gap-3">
              {button('google')}
              {button('apple')}
            </div>
            <p className="mt-7 text-center text-[15px] text-white/55">
              {up ? 'Already have an account?' : 'New to MEMBRS?'}{' '}
              <button
                type="button"
                onClick={() => setMode(up ? 'in' : 'up')}
                className="text-accent font-semibold"
              >
                {up ? 'Sign in' : 'Create one'}
              </button>
            </p>
            <p className="mt-7 text-center text-[13px] text-white/45 md:mt-14">
              By continuing, you agree to our{' '}
              <Link
                href={paths.legal('terms')}
                onClick={closeOverlay}
                className="underline underline-offset-2"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href={paths.legal('privacy')}
                onClick={closeOverlay}
                className="underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
