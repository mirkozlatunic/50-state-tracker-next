// The app's secret settings, read from the environment: .env.local on the
// computer (made by `pnpm set-password`), and Vercel's settings online.

/** The saved password hash, or "" if no password is set yet. */
export function passwordHash(): string {
  return process.env.PASSWORD_HASH ?? "";
}

/** The secret that signs the login cookie, or "" if not set yet. */
export function sessionSecret(): string {
  return process.env.SESSION_SECRET ?? "";
}

/** True once a password and a session secret are set. */
export function isSetUp(): boolean {
  return passwordHash() !== "" && sessionSecret().length >= 32;
}

/** The login cookie is https-only online; `pnpm dev` on the computer uses plain http. */
export function secureCookies(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Where the database is: Turso online, a local file on the computer. */
export function databaseConfig() {
  return { url: process.env.DATABASE_URL ?? "file:local.sqlite", authToken: process.env.DATABASE_AUTH_TOKEN };
}
