import { describe, expect, it } from 'vitest';
import { normaliseEmail } from './auth';

describe('the email a feature asks for', () => {
  it('is trimmed and lowercased before it is sent', () => {
    expect(normaliseEmail('  Ada@Example.COM ')).toBe('ada@example.com');
  });
});
