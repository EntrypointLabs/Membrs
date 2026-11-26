import { useState, type FormEvent } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { track, type SignInPlacement } from '../lib/analytics';
import {
  EmailNotAcceptedError,
  readerKnown,
  sessionStore,
  startReaderSession,
} from '../lib/auth';
import { isValidEmail } from '../lib/email';
import { messageOf } from '../lib/http';
import { useStore } from '../lib/store';
import { paths } from '../lib/router';
import { toast } from '../lib/ui';
import { Link } from './Link';

/**
 * What every feature that needs to know the reader uses to ask for their
 * email in place. `known` is true once the browser holds a session, and
 * `ensureKnown` starts one from the typed address before the feature carries
 * on, so the reader is only ever asked once.
 */
export function useReaderEmail(placement: SignInPlacement, initial = '') {
  const known = readerKnown(useStore(sessionStore));
  const [email, setEmail] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function ensureKnown(address = email): Promise<boolean> {
    if (readerKnown(sessionStore.get())) return true;
    setBusy(true);
    track('sign_in_started', { provider: 'email', placement });
    try {
      await startReaderSession(address);
      return true;
    } catch (error) {
      track('sign_in_failed', {
        provider: 'email',
        reason:
          error instanceof EmailNotAcceptedError ? 'not_accepted' : 'error',
        placement,
      });
      toast(messageOf(error, 'We could not use that email. Please try again.'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    known,
    email,
    setEmail,
    busy,
    ready: isValidEmail(email),
    ensureKnown,
  };
}

export function ReaderEmailField({
  id,
  value,
  onChange,
  className = '',
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Input
      id={id}
      type="email"
      name="email"
      autoComplete="email"
      inputMode="email"
      required
      aria-label={id ? undefined : 'Your email'}
      placeholder="you@example.com"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-[50px] px-4 text-[15px] md:text-[15px] ${className}`}
    />
  );
}

/**
 * The email field and the feature's own action button, for features with no
 * form of their own. Pressing the button keeps the address and then does the
 * action, so it reads as one step.
 */
export function EmailStep({
  actionLabel,
  onContinue,
  placement,
  inputClassName = '',
  askTerms = false,
}: {
  actionLabel: string;
  onContinue: () => void;
  placement: SignInPlacement;
  inputClassName?: string;
  askTerms?: boolean;
}) {
  const { email, setEmail, busy, ready, ensureKnown } =
    useReaderEmail(placement);
  const [agreed, setAgreed] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await ensureKnown()) onContinue();
  }

  return (
    <form className="grid w-full gap-3" onSubmit={submit}>
      <ReaderEmailField
        value={email}
        onChange={setEmail}
        className={inputClassName}
      />
      {askTerms && <TermsConsent agreed={agreed} onChange={setAgreed} />}
      <button
        type="submit"
        disabled={!ready || busy || (askTerms && !agreed)}
        className="bg-brand hover:bg-brand-hover flex h-[50px] items-center justify-center gap-3 rounded-md px-4 text-[15px] font-bold text-white transition-[translate,scale,background-color] duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy && (
          <i className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-current border-r-transparent" />
        )}
        {actionLabel}
      </button>
    </form>
  );
}

export function TermsConsent({
  agreed,
  onChange,
}: {
  agreed: boolean;
  onChange: (agreed: boolean) => void;
}) {
  return (
    <label className="text-fg-3 flex items-start gap-2.5 text-left text-[13px] leading-snug">
      <Checkbox
        checked={agreed}
        onCheckedChange={(state) => onChange(state === true)}
        aria-label="I agree to the Terms of Service and Privacy Policy"
        className="mt-0.5"
      />
      <span>
        I agree to the{' '}
        <Link
          href={paths.legal('terms')}
          className="text-fg underline underline-offset-2"
        >
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link
          href={paths.legal('privacy')}
          className="text-fg underline underline-offset-2"
        >
          Privacy Policy
        </Link>
        , and to the weekly email.
      </span>
    </label>
  );
}
