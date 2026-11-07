import { closeOverlay } from '../lib/ui';
import { Icon } from './Icon';
import { Modal } from './Modal';

/**
 * Your plans: what you added to your calendar or set reminders for. membrs
 * has no accounts, so plans live in the reader's own calendar; this explains
 * that and points them there.
 */
export function PlansModal() {
  return (
    <Modal title="Your plans" onClose={closeOverlay}>
      <div className="py-6 text-center">
        <Icon name="cal" className="text-fg-3 mx-auto h-8 w-8" />
        <p className="mt-4 font-semibold">Nothing planned yet</p>
        <p className="text-fg-3 mx-auto mt-2 max-w-xs text-[15px]">
          Tap Add to calendar on any event and it lands in your own calendar,
          with a reminder.
        </p>
      </div>
    </Modal>
  );
}
