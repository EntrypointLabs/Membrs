import type { ReactNode } from 'react';
import { titleCase } from '../lib/text';

interface SectionHeaderProps {
  title: string;
  /** One line under the title saying what the section holds. */
  body?: ReactNode;
  /** Controls on the right: filters, a see-all link. */
  actions?: ReactNode;
  id?: string;
}

export function SectionHeader({
  title,
  body,
  actions,
  id,
}: SectionHeaderProps) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-5 md:mb-14">
      <div>
        <h2
          id={id}
          className="text-[30px] leading-tight font-semibold tracking-tight md:text-[44px]"
        >
          {titleCase(title)}
        </h2>
        {body && (
          <p className="text-fg-3 mt-3 max-w-xl text-base md:mt-4">{body}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
