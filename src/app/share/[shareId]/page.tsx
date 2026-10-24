import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BrandLogo } from "@/components/brand-logo";
import { MapSkeleton } from "@/components/loading-skeletons";
import { UsMap } from "@/components/map/us-map";
import { appDatabase } from "@/db/app";
import { sharedProgress } from "@/db/queries";
import { STATES } from "@/lib/data/states";
import type { StateStatus } from "@/lib/progress";

// Search engines are asked not to list shared maps (or follow links from them).
export const metadata: Metadata = { title: "A 50 States map", robots: { index: false, follow: false } };

// A shared progress map (slice 20), open to anyone with the link and no sign-in.
// It lives outside the (app) folder, so it has no header or menu. It shows
// only which states the owner has visited, and the count: no dates, notes,
// cities, trips, stories or photos, and the states don't link anywhere.
export default function SharedMapPage({ params }: PageProps<"/share/[shareId]">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-6 px-4 py-10">
      <BrandLogo pixels={72} alt="50 States Tracker" />
      <Suspense fallback={<MapSkeleton />}>
        <SharedMap params={params} />
      </Suspense>
      <p className="text-sm text-muted-foreground">
        Made with{" "}
        <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">
          50 States Tracker
        </Link>
      </p>
    </main>
  );
}

/** The count and the map, read fresh; a link that's unknown or no longer shared is "Not found". */
async function SharedMap({ params }: Pick<PageProps<"/share/[shareId]">, "params">) {
  await connection();
  const progress = await sharedProgress(await appDatabase(), (await params).shareId);
  if (!progress) notFound();
  const visited = new Set(progress.visitedStates);
  const statuses = Object.fromEntries(
    STATES.map(([code]) => [code, visited.has(code) ? "visited" : "unvisited"] satisfies [string, StateStatus]),
  );
  return (
    <>
      <h1 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
        {visited.size} of 50 states visited
      </h1>
      <div className="w-full">
        <UsMap statuses={statuses} dots={[]} linked={false} />
      </div>
    </>
  );
}
