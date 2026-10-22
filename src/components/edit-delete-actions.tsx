"use client";
// Edit and Delete for one row (a visit or a trip): two ghost buttons of the
// same size on one line. Delete asks first, in a shadcn "Are you sure?" pop-up,
// then runs `deleteAction` (a server action, passed in by the page).

import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";

export function EditDeleteActions({
  editHref,
  question,
  details,
  deleteAction,
}: {
  editHref: string;
  question: string;
  details: string;
  deleteAction: () => Promise<void>;
}) {
  return (
    <div className="flex items-center gap-1">
      <Link href={editHref} className={buttonVariants({ variant: "ghost" })} data-slot="button">
        Edit
      </Link>
      <AlertDialog>
        <AlertDialogTrigger
          data-slot="button"
          render={<Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" />}
        >
          Delete
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{question}</AlertDialogTitle>
            <AlertDialogDescription>{details}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={deleteAction}>
              <AlertDialogAction type="submit" variant="destructive" className="w-full">
                Delete
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
