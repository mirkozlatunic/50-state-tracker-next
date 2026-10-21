// The footer on every page after logging in: backup and log out, on one line.

import { logOut } from "@/app/login/actions";
import { Button, buttonVariants } from "@/components/ui/button";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-end gap-2 px-4 py-2">
        {/* A plain link on purpose: it downloads a file instead of opening a page. */}
        <a href="/backup" download data-slot="button" className={buttonVariants({ variant: "ghost" })}>
          Download backup
        </a>
        <form action={logOut}>
          <Button type="submit" variant="ghost">
            Log out
          </Button>
        </form>
      </div>
    </footer>
  );
}
