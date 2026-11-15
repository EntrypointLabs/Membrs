export const EXIT_MS = 200;

export const BACKDROP_MOTION =
  'transition-opacity duration-200 ease-out starting:opacity-0 group-data-[leaving=true]/presence:opacity-0 group-data-[leaving=true]/presence:duration-150';

export const SHEET_MOTION =
  'transition-[translate,scale,opacity] duration-300 ease-drawer starting:translate-y-full group-data-[leaving=true]/presence:translate-y-full group-data-[leaving=true]/presence:duration-200 group-data-[leaving=true]/presence:ease-out md:duration-200 md:ease-out-strong md:starting:translate-y-0 md:starting:scale-[0.96] md:starting:opacity-0 md:group-data-[leaving=true]/presence:translate-y-0 md:group-data-[leaving=true]/presence:scale-[0.97] md:group-data-[leaving=true]/presence:opacity-0 md:group-data-[leaving=true]/presence:duration-150';

export const TOAST_MOTION =
  'transition-[translate,opacity] duration-200 ease-out-strong starting:translate-y-2 starting:opacity-0 group-data-[leaving=true]/presence:translate-y-1 group-data-[leaving=true]/presence:opacity-0 group-data-[leaving=true]/presence:duration-150';
