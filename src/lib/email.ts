/**
 * A deliberately loose check: something before an @, a domain, and a dot with
 * at least two letters after it. Anything stricter rejects real addresses;
 * the confirmation email is the real test.
 */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** The message for an empty or malformed address, in the digest's voice. */
export function emailError(value: string): string {
  return value.trim()
    ? 'That email looks incomplete. Check for a missing @ or domain.'
    : 'Add your email so we know where to send the digest.';
}
