import { TOAST_MOTION } from '../lib/motion';
import { useStore } from '../lib/store';
import { toastStore } from '../lib/ui';
import { Presence } from './Presence';

export function Toast() {
  const current = useStore(toastStore);
  return (
    <Presence value={current}>
      {(shown) => (
        <div
          key={shown.id}
          role="status"
          className={`bg-inv text-inv-fg fixed bottom-24 left-1/2 z-[100] w-max max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-md px-5 py-3 text-[15px] font-medium shadow-[0_0_0_2px_var(--bg),0_24px_48px_rgb(0_0_0/0.4)] md:bottom-8 md:max-w-[560px] ${TOAST_MOTION}`}
        >
          {shown.text}
        </div>
      )}
    </Presence>
  );
}
