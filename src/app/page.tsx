import { Button } from "@/components/ui/button";
import { logOut } from "./login/actions";

// Placeholder home page. The real pages arrive in slices 3–7.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">50 States Tracker</h1>
      <p className="text-muted-foreground">
        The Next.js version is being built. The states, trips and map come next.
      </p>
      <form action={logOut}>
        <Button type="submit" variant="outline" size="lg">
          Log out
        </Button>
      </form>
    </main>
  );
}
