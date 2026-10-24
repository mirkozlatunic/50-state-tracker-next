// Share codes for a shareable progress map (slice 20). The link is
// /share/<code>; the code is 128 random bits, so nobody can guess it.

/** A new share code: 16 random bytes written as 22 URL-safe characters (base64url). */
export function newShareId(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64url");
}

/** True when `text` looks like a share code (checked before asking the database). */
export function isShareId(text: string): boolean {
  return /^[A-Za-z0-9_-]{22}$/.test(text);
}
