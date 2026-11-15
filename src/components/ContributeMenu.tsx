import type { ReactElement } from 'react';
import { DropdownMenu } from 'radix-ui';
import { CONTRIBUTE_KINDS } from '../lib/contribute';
import { navigate, paths } from '../lib/router';
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
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={8}
          className="bg-panel border-line-2 z-50 min-w-48 rounded-lg border p-1.5 shadow-2xl"
        >
          {CONTRIBUTE_KINDS.map((k) => {
            const look = lookOf(k.value);
            return (
              <DropdownMenu.Item
                key={k.value}
                onSelect={() => navigate(paths.contribute(k.value))}
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
