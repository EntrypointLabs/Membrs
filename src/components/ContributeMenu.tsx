import { useRef, type ReactElement } from 'react';
import { DropdownMenu } from 'radix-ui';
import { area, contextOf, track } from '../lib/analytics';
import { CONTRIBUTE_KINDS } from '../lib/contribute';
import { navigate, paths, useRoute } from '../lib/router';
import type { ContributeKind } from '../lib/types';
import { Icon, type IconName } from './Icon';
import { navItem } from './nav';

const SECTION_OF_KIND = {
  event: 'events',
  opportunity: 'opportunities',
  place: 'places',
  promo: 'promos',
  ad: 'contribute',
} as const;

function lookOf(kind: ContributeKind): { icon: IconName; color: string } {
  const section = navItem(SECTION_OF_KIND[kind]);
  return { icon: kind === 'ad' ? 'spark' : section.icon, color: section.color };
}

export function ContributeMenu({
  trigger,
  align = 'center',
}: {
  trigger: ReactElement;
  align?: 'start' | 'center' | 'end';
}) {
  const route = useRoute();
  const triggerRef = useRef<HTMLButtonElement>(null);

  // The items render in a portal, outside the area the trigger sits in, so
  // the placement is read off the trigger instead.
  function choose(kind: ContributeKind) {
    const placement = contextOf(triggerRef.current).area;
    track('contribute_menu_selected', {
      kind,
      placement: typeof placement === 'string' ? placement : 'unknown',
    });
    if (route.page === 'contribute' && route.kind !== kind)
      track('contribute_kind_switched', { from: route.kind, to: kind });
    navigate(paths.contribute(kind));
  }

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild ref={triggerRef}>
        {trigger}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={8}
          className="bg-panel border-line-2 z-50 min-w-48 rounded-lg border p-1.5 shadow-2xl"
          {...area('contribute_menu')}
        >
          {CONTRIBUTE_KINDS.map((k) => {
            const look = lookOf(k.value);
            return (
              <DropdownMenu.Item
                key={k.value}
                onSelect={() => choose(k.value)}
                className="data-[highlighted]:bg-soft-hover flex h-11 cursor-pointer items-center gap-3 rounded-md px-3.5 text-[15px] font-semibold outline-none"
              >
                <Icon
                  name={look.icon}
                  className={`h-[18px] w-[18px] ${look.color}`}
                />
                {k.label}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
