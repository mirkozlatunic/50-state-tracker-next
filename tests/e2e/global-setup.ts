// Runs once before the browser tests: gets a Clerk "testing token" (so Clerk
// lets the test browser sign in without bot checks) and makes sure the two
// test people exist in Clerk's development app, saving their ids for the tests.
import { clerkSetup } from "@clerk/testing/playwright";
import { USER_A_EMAIL, USER_B_EMAIL } from "./helpers";

const CLERK_API = "https://api.clerk.com/v1";

/** Ask Clerk's server API (with the secret key) for something. */
async function clerkApi(path: string, init: RequestInit = {}) {
  const response = await fetch(`${CLERK_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(`Clerk API ${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

/** The Clerk id of the person with this email, creating them the first time. */
async function ensureTestUser(email: string): Promise<string> {
  const found = await clerkApi(`/users?email_address=${encodeURIComponent(email)}`);
  if (found.length > 0) return found[0].id;
  const created = await clerkApi("/users", {
    method: "POST",
    body: JSON.stringify({ email_address: [email], skip_password_requirement: true }),
  });
  return created.id;
}

export default async function globalSetup() {
  if (!process.env.CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY isn't set (see README: Clerk keys).");
  await clerkSetup();
  process.env.E2E_USER_A_ID = await ensureTestUser(USER_A_EMAIL);
  process.env.E2E_USER_B_ID = await ensureTestUser(USER_B_EMAIL);
}
