import type { IconName } from './Icon';
import type { FeedKind } from '../lib/router';

export interface NavItem {
  key: FeedKind | 'home' | 'contribute';
  label: string;
  /** What the phone tab bar shows when the tab is active. */
  short?: string;
  href: string;
  icon: IconName;
  /** The section colour. Icons always show it, active or not. */
  color: string;
  /** The underline under the active item, in the same colour. */
  bar: string;
}

/** The sections, in nav order. Header and mobile tab bar both read this. */
export const NAV: NavItem[] = [
  {
    key: 'home',
    label: 'Home',
    href: '/',
    icon: 'home',
    color: 'text-fg-3',
    bar: 'bg-fg',
  },
  {
    key: 'events',
    label: 'Events',
    href: '/events',
    icon: 'cal',
    color: 'text-[#fd7a6e]',
    bar: 'bg-[#fd7a6e]',
  },
  {
    key: 'opportunities',
    label: 'Opportunities',
    short: 'Opps',
    href: '/opportunities',
    icon: 'award',
    color: 'text-[#a996ff]',
    bar: 'bg-[#a996ff]',
  },
  {
    key: 'places',
    label: 'Places',
    href: '/places',
    icon: 'pin',
    color: 'text-[#4cc98a]',
    bar: 'bg-[#4cc98a]',
  },
  {
    key: 'promos',
    label: 'Promos',
    href: '/promos',
    icon: 'tag',
    color: 'text-[#f47fb0]',
    bar: 'bg-[#f47fb0]',
  },
  {
    key: 'contribute',
    label: 'Contribute',
    href: '/contribute',
    icon: 'plus',
    color: 'text-[#6f93ff]',
    bar: 'bg-[#6f93ff]',
  },
];
