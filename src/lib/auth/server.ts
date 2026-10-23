// Who's signed in, as used by pages and form actions on the server.
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/** The signed-in person's Clerk id (like "user_2ab..."), which marks whose
 * visits and trips are whose. Signed out: off to the sign-in page instead.
 * Every page and form action that touches data calls this itself, instead of
 * only relying on proxy.ts. */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return userId;
}
