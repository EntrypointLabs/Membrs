import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { UnsubscribeScreen } from './UnsubscribeScreen';

const unsubscribe = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('../lib/api', () => ({ unsubscribe }));

describe('UnsubscribeScreen', () => {
  it('waits for the reader to press the button', () => {
    const html = renderToString(
      <UnsubscribeScreen token="abc" notYou={false} />,
    );
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(html).toContain('>Unsubscribe</button>');
  });

  it('says a not-you link stops all email before the reader presses anything', () => {
    const html = renderToString(<UnsubscribeScreen token="abc" notYou />);
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(html).toContain('Stop all MEMBRS email to this address');
    expect(html).not.toContain('Other MEMBRS emails are unchanged');
  });

  it('explains a link with no code and offers no button', () => {
    const html = renderToString(<UnsubscribeScreen token="" notYou={false} />);
    expect(html).toContain('missing its code');
    expect(html).not.toContain('<button');
  });
});
