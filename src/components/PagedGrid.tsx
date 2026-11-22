import type { ReactNode } from 'react';
import { PAGE_SIZE } from '../lib/config';
import { clampPage, Pager, pageOf } from './Pager';
import { Rail } from './Rail';

export function PagedGrid<T>({
  items,
  page,
  onPage,
  render,
}: {
  items: T[];
  page: number;
  onPage: (page: number) => void;
  render: (item: T) => ReactNode;
}) {
  const pages = Math.ceil(items.length / PAGE_SIZE);
  const current = clampPage(String(page), pages);
  return (
    <>
      <Rail>{pageOf(items, current, PAGE_SIZE).map(render)}</Rail>
      <div className="hidden md:block">
        <Pager
          page={current}
          pages={pages}
          total={items.length}
          onChange={onPage}
        />
      </div>
    </>
  );
}
