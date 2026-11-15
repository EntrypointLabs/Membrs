import { describe, expect, it } from 'vitest';
import { blocks, inlines, safeHref } from './markdown';

describe('inlines', () => {
  it('reads bold and links', () => {
    expect(
      inlines('See **Afropolitan** at [the site](https://a.test/x).'),
    ).toEqual([
      { kind: 'text', text: 'See ' },
      { kind: 'bold', text: 'Afropolitan' },
      { kind: 'text', text: ' at ' },
      { kind: 'link', text: 'the site', href: 'https://a.test/x' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('links a bare URL without the trailing full stop', () => {
    expect(inlines('Go to https://a.test/apply.')).toEqual([
      { kind: 'text', text: 'Go to ' },
      {
        kind: 'link',
        text: 'https://a.test/apply',
        href: 'https://a.test/apply',
      },
      { kind: 'text', text: '.' },
    ]);
  });

  it('turns unsafe links into plain text', () => {
    expect(inlines('[click](javascript:alert(1))')).toEqual([
      { kind: 'text', text: 'click)' },
    ]);
  });

  it('keeps markup as text', () => {
    expect(inlines('<img src=x onerror=alert(1)>')).toEqual([
      { kind: 'text', text: '<img src=x onerror=alert(1)>' },
    ]);
  });
});

describe('safeHref', () => {
  it('allows http, https and app paths only', () => {
    expect(safeHref('https://a.test')).toBe('https://a.test');
    expect(safeHref('/listing/e1')).toBe('/listing/e1');
    expect(safeHref('//evil.test')).toBeNull();
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,hi')).toBeNull();
  });
});

describe('blocks', () => {
  it('splits paragraphs, line breaks and lists', () => {
    const text =
      'Here are two:\nboth free\n\n- **One**\n* Two\n\n1. First\n2) Second';
    expect(blocks(text)).toEqual([
      {
        kind: 'paragraph',
        lines: [
          [{ kind: 'text', text: 'Here are two:' }],
          [{ kind: 'text', text: 'both free' }],
        ],
      },
      {
        kind: 'list',
        ordered: false,
        items: [
          [{ kind: 'bold', text: 'One' }],
          [{ kind: 'text', text: 'Two' }],
        ],
      },
      {
        kind: 'list',
        ordered: true,
        items: [
          [{ kind: 'text', text: 'First' }],
          [{ kind: 'text', text: 'Second' }],
        ],
      },
    ]);
  });

  it('shows a heading as a bold line', () => {
    expect(blocks('## This week')).toEqual([
      { kind: 'paragraph', lines: [[{ kind: 'bold', text: 'This week' }]] },
    ]);
  });
});
