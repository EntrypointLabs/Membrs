import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EmailStep } from './EmailStep';

describe('EmailStep', () => {
  it('asks for an email next to the feature action, never for a sign-in', () => {
    const html = renderToString(
      <EmailStep actionLabel="Get the weekly email" onContinue={() => {}} />,
    );
    expect(html).toContain('type="email"');
    expect(html).toContain('Get the weekly email');
    expect(html.toLowerCase()).not.toContain('sign in');
  });
});
