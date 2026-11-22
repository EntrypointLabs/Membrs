import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { track } from '../lib/analytics';
import { useDialog } from '../lib/focus';
import { BACKDROP_MOTION, SHEET_MOTION } from '../lib/motion';
import { titleCase } from '../lib/text';
import { Icon } from './Icon';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Wide two-column layout, as the digest picker uses. */
  wide?: boolean;
}

/**
 * A centred dialog on web, a bottom sheet on phones. Escape and the backdrop
 * close it, focus moves inside on open and the page behind stops scrolling.
 */
export function Modal({ title, onClose, children, wide = false }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const close = (method: 'escape' | 'backdrop' | 'button') => {
    track('modal_closed', { modal: title, method });
    onClose();
  };
  useDialog(panel, () => close('escape'));

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  // Rendered into the body so a sheet opened from a sticky title bar is not
  // trapped in that bar's stacking context, under the phone tab bar.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <button
        type="button"
        aria-label="Close"
        onClick={() => close('backdrop')}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${BACKDROP_MOTION}`}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={titleCase(title)}
        tabIndex={-1}
        className={`bg-panel border-line-2 relative max-h-[92dvh] w-full overflow-y-auto rounded-t-lg border p-6 shadow-2xl outline-none md:rounded-lg md:p-8 ${SHEET_MOTION} ${
          wide ? 'md:max-w-[1080px]' : 'md:max-w-[520px]'
        }`}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            {titleCase(title)}
          </h2>
          <button
            type="button"
            onClick={() => close('button')}
            aria-label="Close"
            className="bg-btn hover:bg-btn-hover grid h-9 w-9 place-items-center rounded-md"
          >
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
