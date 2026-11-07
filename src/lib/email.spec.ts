import { describe, expect, it } from 'vitest';
import { emailError, isValidEmail } from './email';

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isValidEmail('ada@membrs.app')).toBe(true);
    expect(isValidEmail('  ada.l+digest@mail.co.uk ')).toBe(true);
  });

  it('rejects incomplete ones', () => {
    expect(isValidEmail('ada')).toBe(false);
    expect(isValidEmail('ada@membrs')).toBe(false);
    expect(isValidEmail('ada@membrs.a')).toBe(false);
  });
});

describe('emailError', () => {
  it('asks for an email when empty and a fix when wrong', () => {
    expect(emailError('')).toMatch(/Add your email/);
    expect(emailError('ada@')).toMatch(/incomplete/);
  });
});
