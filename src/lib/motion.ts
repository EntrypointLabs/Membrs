export const EXIT_MS = 200;

export const BACKDROP_MOTION =
  'transition-opacity duration-200 ease-out starting:opacity-0 group-data-[leaving=true]/presence:opacity-0 group-data-[leaving=true]/presence:duration-150';

export const SHEET_MOTION =
  'transition-[translate,scale,opacity] duration-300 ease-drawer starting:translate-y-full group-data-[leaving=true]/presence:translate-y-full group-data-[leaving=true]/presence:duration-200 group-data-[leaving=true]/presence:ease-out md:duration-200 md:ease-out-strong md:starting:translate-y-0 md:starting:scale-[0.96] md:starting:opacity-0 md:group-data-[leaving=true]/presence:translate-y-0 md:group-data-[leaving=true]/presence:scale-[0.97] md:group-data-[leaving=true]/presence:opacity-0 md:group-data-[leaving=true]/presence:duration-150';

export const TOAST_MOTION =
  'transition-[translate,opacity] duration-200 ease-out-strong starting:translate-y-2 starting:opacity-0 group-data-[leaving=true]/presence:translate-y-1 group-data-[leaving=true]/presence:opacity-0 group-data-[leaving=true]/presence:duration-150';

export const PHONE_PILL = 'phone-pill';

export const PILL_SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.9,
} as const;

export const PHONE_PILL_PLACE =
  'max-md:fixed max-md:inset-x-3 max-md:bottom-[calc(12px+env(safe-area-inset-bottom,0px))] max-md:z-[65]';

export const PHONE_SHEET =
  'max-md:rounded-t-[20px] max-md:border-t max-md:border-line-2 max-md:h-[calc(100dvh-44px-env(safe-area-inset-top,0px))]';
