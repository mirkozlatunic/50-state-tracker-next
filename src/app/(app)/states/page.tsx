import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { PageBody, PageTitle } from "@/components/page-title";
import { appDatabase } from "@/db/app";
import { listStates } from "@/db/queries";

export const metadata: Metadata = { title: "States" };

// All 50 states A to Z, with the visited ones marked.
export default function StatesPage() {
  return (
    <PageBody>
      <PageTitle>States</PageTitle>
      <Suspense fallback={<p className="text-muted-foreground">Loading states…</p>}>
        <StatesList />
      </Suspense>
    </PageBody>
  );
}

/** The list itself, read fresh from the database on every visit. */
async function StatesList() {
  await connection();
  const states = await listStates(await appDatabase());
  return (
    <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
      {states.map((state) => (
        <li key={state.code} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted">
          <span className="w-7 font-mono text-xs text-muted-foreground">{state.code}</span>
          <Link href={`/states/${state.code}`} className="flex-1 hover:underline">
            {state.name}
          </Link>
          {state.visited && <Badge className="bg-visited/15 text-visited-text">visited</Badge>}
        </li>
      ))}
    </ul>
  );
}
