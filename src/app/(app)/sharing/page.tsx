import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import { CopyLink } from "@/components/copy-link";
import { FormSkeleton } from "@/components/loading-skeletons";
import { PageBody, PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { appDatabase } from "@/db/app";
import { shareId } from "@/db/queries";
import { requireUserId } from "@/lib/auth/server";
import { shareMap, stopSharingMap } from "./actions";

export const metadata: Metadata = { title: "Share" };

// My share settings (slice 20): off until I turn it on; then the link, Copy
// link, Make a new link and Stop sharing.
export default function SharingPage() {
  return (
    <PageBody narrow>
      <PageTitle>Share your map</PageTitle>
      <p className="text-muted-foreground">
        People with the link see only which states you&apos;ve visited, on a map with the count. No dates, notes,
        cities, trips, stories or photos. Search engines are asked not to list it.
      </p>
      <Suspense fallback={<FormSkeleton fields={1} />}>
        <SharingSettings />
      </Suspense>
    </PageBody>
  );
}

/** Whether my map is shared, read fresh, with the buttons that change it. */
async function SharingSettings() {
  await connection();
  const userId = await requireUserId(); // only my own sharing
  const code = await shareId(await appDatabase(), userId);

  if (!code) {
    return (
      <form action={shareMap} className="flex flex-col items-start gap-3">
        <p>Your map isn&apos;t shared.</p>
        <Button type="submit">Share my map</Button>
      </form>
    );
  }

  // The full link, with this site's own address (it differs between previews and the live site).
  const request = await headers();
  const origin = `${request.get("x-forwarded-proto") ?? "http"}://${request.get("host")}`;
  return (
    <div className="flex flex-col gap-4">
      <p>Your map is shared.</p>
      <CopyLink url={`${origin}/share/${code}`} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <form action={shareMap}>
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            Make a new link
          </Button>
        </form>
        <form action={stopSharingMap}>
          <Button type="submit" variant="outline" className="w-full text-destructive hover:text-destructive sm:w-auto">
            Stop sharing
          </Button>
        </form>
      </div>
      <p className="text-sm text-muted-foreground">A new link replaces this one; the old link stops working at once.</p>
    </div>
  );
}
