import { useEffect, useState } from 'react';
import { naira, type AdQuote } from '../lib/ads';
import { Icon } from './Icon';

const METHODS = ['Card', 'Bank transfer', 'USSD'] as const;

/**
 * A stand-in for Bachs' checkout window, used only while there is no backend
 * to create a real session. It is labelled as a demo and takes no input: in
 * production Bachs opens its own secure overlay and no card details ever
 * touch membrs.
 */
export function BachsDemo({
  quote,
  email,
  onPaid,
  onClose,
}: {
  quote: AdQuote;
  email: string;
  onPaid: () => void;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<(typeof METHODS)[number]>('Card');
  const [stage, setStage] = useState<'idle' | 'paying' | 'done'>('idle');

  useEffect(() => {
    if (stage === 'paying') {
      const t = setTimeout(() => setStage('done'), 1300);
      return () => clearTimeout(t);
    }
    if (stage === 'done') {
      const t = setTimeout(onPaid, 1100);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [stage, onPaid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === 'Escape' && stage === 'idle' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [stage, onClose]);

  const input =
    'h-11 w-full rounded-[9px] border-[1.5px] border-[#e4e4e7] bg-[#fafafa] px-3 text-[15px] text-[#111]';

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4">
      <button
        type="button"
        aria-label="Cancel payment"
        onClick={() => stage === 'idle' && onClose()}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pay with Bachs"
        className="relative w-[min(400px,calc(100vw-32px))] rounded-lg bg-white p-[22px] text-[#111] shadow-2xl"
      >
        {stage === 'done' ? (
          <div className="grid place-items-center gap-2 py-8 text-center">
            <Icon name="check" className="h-11 w-11 text-[#12b76a]" />
            <b className="text-[19px]">Payment received</b>
            <span className="text-sm text-[#666]">
              {naira(quote.total)} · receipt sent to {email}
            </span>
          </div>
        ) : (
          <>
            <div className="mb-[18px] flex items-center gap-2.5">
              <b className="text-xl font-black tracking-tight">Bachs</b>
              <span className="flex-1 text-[12.5px] text-[#666]">
                Secure checkout · Demo
              </span>
              <button
                type="button"
                onClick={onClose}
                disabled={stage !== 'idle'}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-sm bg-[#f2f2f2]"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[13px] text-[#666]">
              MEMBRS · {quote.placement}, {quote.days} days
            </p>
            <p className="mb-[18px] text-[30px] font-bold tracking-tight">
              {naira(quote.total)}
            </p>
            <div className="mb-3.5 flex gap-1.5">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  aria-pressed={method === m}
                  className={`h-[38px] flex-1 rounded-[9px] border-[1.5px] bg-white text-[13.5px] font-semibold ${method === m ? 'border-[#111]' : 'border-[#e4e4e7]'}`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="grid gap-2.5 text-[12.5px] text-[#555]">
              <label className="grid gap-1.5">
                Card number
                <input readOnly value="4242 4242 4242 4242" className={input} />
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="grid gap-1.5">
                  Expiry
                  <input readOnly value="12 / 28" className={input} />
                </label>
                <label className="grid gap-1.5">
                  CVC
                  <input readOnly value="•••" className={input} />
                </label>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStage('paying')}
              disabled={stage !== 'idle'}
              className="mt-4 flex h-[50px] w-full items-center justify-center gap-2 rounded-[11px] bg-[#111] text-base font-bold text-white disabled:opacity-80"
            >
              {stage === 'paying' ? (
                <>
                  <i className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  Processing…
                </>
              ) : (
                `Pay ${naira(quote.total)}`
              )}
            </button>
            <p className="mt-3 text-center text-xs text-[#777]">
              A demo of the Bachs overlay. In production Bachs opens its own
              secure window and no card details touch membrs.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
