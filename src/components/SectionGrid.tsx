import type { ReactNode } from 'react';
import { useSectionItems, type SectionPath } from '../lib/api';
import { PAGE_SIZE } from '../lib/config';
import type { ListingSummary, Section } from '../lib/types';
import { clampPage, Pager } from './Pager';
import { Rail } from './Rail';

export function SectionGrid({
  section,
  pathOf,
  page,
  onPage,
  render,
  category,
  size = PAGE_SIZE,
}: {
  section: Section;
  pathOf: SectionPath;
  page: number;
  onPage: (page: number) => void;
  render: (item: ListingSummary) => ReactNode;
  category?: string;
  size?: number;
}) {
  const { items, total } = useSectionItems(
    section,
    page,
    size,
    pathOf,
    category,
  );
  const pages = Math.ceil(total / size);
  return (
    <>
      <Rail>{items.map(render)}</Rail>
      <div className="hidden md:block">
        <Pager
          page={clampPage(String(page), pages)}
          pages={pages}
          total={total}
          onChange={onPage}
        />
      </div>
    </>
  );
}
