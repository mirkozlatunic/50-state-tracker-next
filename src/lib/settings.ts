// The app's settings, read from the environment: .env.local on the computer,
// and Vercel's settings online. (The Clerk keys are read by Clerk itself.)

/** Where the database is: Turso online, a local file on the computer. */
export function databaseConfig() {
  return { url: process.env.DATABASE_URL ?? "file:local.sqlite", authToken: process.env.DATABASE_AUTH_TOKEN };
}
