import { useEffect, useState } from 'react';
import { naira, placementLabel, type AdQuote } from '../lib/ads';
import { Button } from '@/components/ui/button';

/**
 * Stands in for the Bachs checkout window while no payment server is
 * connected (VITE_API_BASE is empty). It does not imitate Bachs: it says
 * plainly that it is a test and charges nothing. With a server, Bachs opens
 * its own window instead and this never renders.
 */
export function BachsDemo({
  quote,
  onPaid,
  onClose,
}: {
  quote: AdQuote;
  onPaid: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!busy) return undefined;
    const t = setTimeout(onPaid, 900);
    return () => clearTimeout(t);
  }, [busy, onPaid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === 'Escape' && !busy && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-end p-4 sm:place-items-center">
      <button
        type="button"
        aria-label="Cancel"
        onClick={() => !busy && onClose()}
        className="absolute inset-0 bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="test-checkout"
        className="bg-panel border-line-2 relative w-full max-w-[420px] rounded-lg border p-6 shadow-2xl"
      >
        <h2 id="test-checkout" className="text-xl font-semibold">
          Test checkout
        </h2>
        <p className="text-fg-3 mt-2 text-[15px] leading-relaxed">
          No payment server is connected yet, so this stands in for the Bachs
          window. Nothing is charged.
        </p>
        <p className="mt-5 text-3xl font-semibold tracking-tight tabular-nums">
          {naira(quote.total)}
        </p>
        <p className="text-fg-3 text-sm">
          {placementLabel(quote.placement)}, {quote.days}{' '}
          {quote.days === 1 ? 'day' : 'days'}
        </p>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => setBusy(true)} disabled={busy}>
            {busy ? 'Completing…' : 'Complete test payment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
