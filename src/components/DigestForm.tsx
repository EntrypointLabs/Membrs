import { forgetEmail, sessionStore } from '../lib/auth';
import { subscriptionStore } from '../lib/preferences';
import { useStore } from '../lib/store';
import { openDigest, toast } from '../lib/ui';
import { EmailStep } from './EmailStep';
import { Icon } from './Icon';

/**
 * The footer's digest block. A reader the browser does not know gives their
 * email here and goes straight on to their city and interests; a known reader
 * without a digest gets one button for that; a subscribed reader sees a
 * status line with Edit. Whenever the browser knows the email, it says which
 * one and offers to forget it, which is how a reader changes it.
 */
export function DigestForm() {
  const session = useStore(sessionStore);
  const joined = useStore(subscriptionStore);

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

  const knownAs = session?.account && (
    <p className="text-inv-fg-2 mt-3 text-sm">
      Using <b className="text-inv-fg">{session.account.email}</b>.{' '}
      <button
        type="button"
        onClick={() => {
          forgetEmail();
          toast('This browser no longer knows your email.');
        }}
        className="text-inv-fg font-semibold underline underline-offset-2"
      >
        Forget it
      </button>
    </p>
  );

  if (session && joined)
    return (
      <div>
        <div className="flex items-center gap-4">
          <p className="text-inv-fg flex flex-1 items-center gap-2.5 text-[17px]">
            <Icon name="check" className="text-open h-5 w-5 shrink-0" />
            <span>
              You get the weekly email for <b>{joined.city}</b>.
            </span>
          </p>
          {settings}
        </div>
        {knownAs}
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
        {knownAs}
      </div>
    );

  return (
    <div className="grid w-full gap-3">
      <EmailStep
        actionLabel="Get the weekly email"
        onContinue={openDigest}
        inputClassName="border-inv-fg-3/50 text-inv-fg placeholder:text-inv-fg-3 bg-transparent dark:bg-transparent"
      />
      <p className="text-inv-fg-2 text-sm">Free every week.</p>
    </div>
  );
}
