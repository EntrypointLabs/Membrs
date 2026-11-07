import { openOverlay } from '../lib/ui';
import { Icon } from './Icon';

/** The floating mail button: the digest signup from anywhere. */
export function DigestFab() {
  return (
    <button
      type="button"
      data-tour="digest"
      onClick={() => openOverlay('digest')}
      aria-label="Get the Sunday digest"
      className="bg-panel border-line-2 fixed right-4 bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-30 grid h-14 w-14 place-items-center rounded-full border text-[#f5b83d] shadow-xl md:right-6 md:bottom-6 md:rounded-md"
    >
      <Icon name="mail" className="h-5 w-5" />
    </button>
  );
}
