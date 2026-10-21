import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** The "not found" message, shared by the app's not-found pages. */
export function NotFoundMessage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
      <p className="text-muted-foreground">There&apos;s no page at this address.</p>
      <Link href="/states" className={buttonVariants({ variant: "outline" })} data-slot="button">
        All states
      </Link>
    </main>
  );
}
