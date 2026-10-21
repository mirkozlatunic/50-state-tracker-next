// The row of buttons at the bottom of every form. On a computer: Cancel and
// Save on the right, on one line. On a phone: full width and stacked, with Save
// on top (flex-col-reverse flips the order, so Save comes last in the code).

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

export function FormActions({ cancelHref, saveLabel, pending }: { cancelHref: string; saveLabel: string; pending: boolean }) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
      <Link href={cancelHref} className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })} data-slot="button">
        Cancel
      </Link>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {saveLabel}
      </Button>
    </div>
  );
}
