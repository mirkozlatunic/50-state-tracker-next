import { redirect } from "next/navigation";

// The old password page's address. Signing in is Clerk's job now, so old links
// and home-screen icons that still open /login go on to the sign-in page.
export default function LoginPage() {
  redirect("/sign-in");
}
