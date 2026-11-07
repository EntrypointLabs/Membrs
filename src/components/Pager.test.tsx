import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Pager, pageOf } from './Pager';

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
