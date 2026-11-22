import { useState } from 'react';
import { unsubscribe, type UnsubscribeScope } from '../lib/api';
import { messageOf } from '../lib/http';
import { paths } from '../lib/router';
import { titleCase } from '../lib/text';
import { Link } from '../components/Link';
import { Button } from '../components/ui/button';

type Step = 'ready' | 'working' | 'done' | 'failed';

const DONE_COPY: Record<UnsubscribeScope, string> = {
  email:
    'You will not get this email again. Other MEMBRS emails are unchanged.',
  weekly:
    'You will not get the weekly emails again. Other MEMBRS emails are unchanged.',
  account: 'We will not email this address again.',
};

/**
 * Where the Unsubscribe link in an email lands. The reader presses the button
 * rather than the page acting on load, so a mail scanner that opens every link
 * cannot unsubscribe them by accident. A not-you link stops all email to the
 * address for good, so it says so before the reader presses anything.
 */
export function UnsubscribeScreen({
  token,
  notYou,
}: {
  token: string;
  notYou: boolean;
}) {
  const [step, setStep] = useState<Step>(token ? 'ready' : 'failed');
  const [scope, setScope] = useState<UnsubscribeScope>(
    notYou ? 'account' : 'email',
  );
  const [error, setError] = useState(
    token ? '' : 'This link is missing its code. Open it from the email again.',
  );
  const confirm = async () => {
    setStep('working');
    try {
      setScope(await unsubscribe(token));
      setStep('done');
    } catch (failure) {
      setError(messageOf(failure, 'Could not unsubscribe.'));
      setStep('failed');
    }
  };
  return (
    <div className="page grid min-h-[50vh] place-items-center text-center">
      <div className="max-w-md">
        <h1 className="text-4xl font-semibold tracking-tight">
          {titleCase(
            step === 'done'
              ? 'You are unsubscribed'
              : notYou
                ? 'Not your email?'
                : 'Unsubscribe',
          )}
        </h1>
        <p
          className="text-fg-2 mt-4"
          role={step === 'failed' ? 'alert' : undefined}
        >
          {step === 'done'
            ? DONE_COPY[scope]
            : step === 'failed'
              ? error
              : notYou
                ? 'Stop all MEMBRS email to this address. We will not email it again.'
                : 'Stop getting this email. Other MEMBRS emails are unchanged.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {step !== 'done' && token && (
            <Button size="lg" onClick={confirm} disabled={step === 'working'}>
              {step === 'working'
                ? 'Unsubscribing'
                : notYou
                  ? 'Stop all email'
                  : 'Unsubscribe'}
            </Button>
          )}
          <Link
            href={paths.home()}
            className="text-fg-2 hover:text-fg inline-flex h-11 items-center px-3 font-semibold"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
