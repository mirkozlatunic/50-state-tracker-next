"use client";
// Edit and Delete for one visit: two ghost buttons of the same size on one
// line. Delete asks first, in a shadcn "Are you sure?" pop-up.

import Link from "next/link";
import { removeVisit } from "@/app/(app)/visits/actions";
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

export function VisitActions({ visitId, label }: { visitId: number; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <Link href={`/visits/${visitId}/edit`} className={buttonVariants({ variant: "ghost" })} data-slot="button">
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
            <AlertDialogTitle>Delete this visit?</AlertDialogTitle>
            <AlertDialogDescription>The visit on {label} will be gone for good.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={removeVisit.bind(null, visitId)}>
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
