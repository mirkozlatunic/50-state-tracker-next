// The password is never stored, only a "hash": a scrambled version that can be
// checked against but not turned back into the password. It uses scrypt, built
// into Node, which is slow on purpose so guessing many passwords takes long.
//
// Only Node built-ins here (no "@/" imports), so `pnpm set-password` can use it too.

import { randomBytes, scrypt, scryptSync, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt's cost settings: N (work), r (memory block size), p (parallel runs).
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

/** Write a hash as "scrypt:N:r:p:salt:key". base64url uses only letters, digits,
 * "-" and "_", so the hash has no "$" for .env files to mangle. */
function format(salt: Buffer, key: Buffer): string {
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join(":");
}

/** Hash a password with a new random salt (so equal passwords get different hashes). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return format(salt, await scryptAsync(password, salt, KEY_LENGTH, { N, r: R, p: P }));
}

/** The same as hashPassword, but blocking: fine for scripts and test setup. */
export function hashPasswordSync(password: string): string {
  const salt = randomBytes(16);
  return format(salt, scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P }));
}

/** True if `password` matches the stored hash. A damaged hash never matches. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = parts.slice(1, 4).map(Number);
  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  if (![n, r, p].every(Number.isInteger) || expected.length === 0) return false;
  try {
    const actual = await scryptAsync(password, salt, expected.length, { N: n, r, p });
    // timingSafeEqual takes as long whatever matches, so timing gives no hints.
    return timingSafeEqual(actual, expected);
  } catch {
    return false; // impossible cost settings
  }
}

/** scrypt as a Promise (Node's version takes a callback). */
function scryptAsync(password: string, salt: Buffer, length: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, length, options, (error, key) => (error ? reject(error) : resolve(key)));
  });
}
