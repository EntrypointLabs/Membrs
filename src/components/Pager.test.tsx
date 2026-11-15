import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { clampPage, Pager, pageOf, pageWindow } from './Pager';

describe('Pager', () => {
  it('renders nothing for a single page', () => {
    expect(
      renderToStaticMarkup(
        <Pager page={1} pages={1} total={5} onChange={() => {}} />,
      ),
    ).toBe('');
  });

  it('marks the current page and disables Previous on the first', () => {
    const html = renderToStaticMarkup(
      <Pager page={1} pages={3} total={30} onChange={() => {}} />,
    );
    expect(html).toContain('Page 1 of 3');
    expect(html).toContain('aria-current="page"');
    expect(html).toMatch(/disabled=""[^>]*>.*Previous/);
  });
});

describe('pageOf', () => {
  it('slices one page', () => {
    expect(pageOf([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
  });
});

describe('pageWindow', () => {
  it('shows every page when they fit', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps seven slots with gaps for long runs', () => {
    expect(pageWindow(1, 26)).toEqual([1, 2, 3, 4, 5, null, 26]);
    expect(pageWindow(4, 26)).toEqual([1, 2, 3, 4, 5, null, 26]);
    expect(pageWindow(5, 26)).toEqual([1, null, 4, 5, 6, null, 26]);
    expect(pageWindow(22, 26)).toEqual([1, null, 21, 22, 23, null, 26]);
    expect(pageWindow(23, 26)).toEqual([1, null, 22, 23, 24, 25, 26]);
    expect(pageWindow(26, 26)).toEqual([1, null, 22, 23, 24, 25, 26]);
  });
});

describe('clampPage', () => {
  it('keeps a page from the URL inside the pages there are', () => {
    expect(clampPage('2', 3)).toBe(2);
    expect(clampPage('999', 3)).toBe(3);
    expect(clampPage('-1', 3)).toBe(1);
    expect(clampPage('0', 3)).toBe(1);
    expect(clampPage('junk', 3)).toBe(1);
    expect(clampPage(null, 3)).toBe(1);
    expect(clampPage('4', 0)).toBe(1);
  });
});
