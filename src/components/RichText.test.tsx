import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RichText } from './RichText';

describe('RichText', () => {
  it('renders bold and turns hash links into paths', () => {
    const html = renderToStaticMarkup(
      <RichText
        text={
          'Read the <b>rules</b> and our <a href="#cookies">Cookie Policy</a>.'
        }
      />,
    );
    expect(html).toContain('<b class="text-fg font-semibold">rules</b>');
    expect(html).toContain('href="/cookies"');
  });

  it('opens cookie settings instead of linking', () => {
    const html = renderToStaticMarkup(
      <RichText
        text={
          'Change it from <a href="#cookies" data-cc="open">Cookie settings</a>.'
        }
      />,
    );
    expect(html).toContain('<button');
    expect(html).not.toContain('href=');
  });

  it('never passes other markup through', () => {
    const html = renderToStaticMarkup(
      <RichText text={'<img src=x onerror=alert(1)>'} />,
    );
    expect(html).not.toContain('<img');
  });
});
