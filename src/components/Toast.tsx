import { useStore } from '../lib/store';
import { toastStore } from '../lib/ui';

export function Toast() {
  const current = useStore(toastStore);
  if (!current) return null;
  return (
    <div
      key={current.id}
      role="status"
      className="bg-inv text-inv-fg fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-md px-5 py-3 text-[15px] font-medium shadow-2xl md:bottom-8"
    >
      {current.text}
    </div>
  );
}
