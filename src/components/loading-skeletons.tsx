// Loading screens: grey shimmering blocks (shadcn Skeleton) shaped like the
// content that's on its way, so the page doesn't jump when it arrives.
// Screen readers hear "Loading" (aria-label) instead of seeing the blocks.

import { Skeleton } from "@/components/ui/skeleton";

/** The wrapper every loading screen uses: announced as "Loading". */
function Loading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-label="Loading" aria-busy className={className}>
      {children}
    </div>
  );
}

/** A few repeated blocks. */
function times(count: number, block: (index: number) => React.ReactNode) {
  return Array.from({ length: count }, (_, index) => block(index));
}

/** The header's "12 of 50" counter. */
export function CounterSkeleton() {
  return <Skeleton aria-label="Loading" className="h-4 w-14" />;
}

/** The states list: a search box and the states in columns. */
export function StatesSkeleton() {
  return (
    <Loading className="flex flex-col gap-4">
      <Skeleton className="h-8 w-full pointer-coarse:h-11 sm:max-w-xs" />
      <div className="grid grid-cols-2 gap-x-2 gap-y-3 lg:grid-cols-3">
        {times(24, (index) => <Skeleton key={index} className="h-6" />)}
      </div>
    </Loading>
  );
}

/** A bordered list of rows (visits, trips). */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Loading className="flex flex-col divide-y rounded-lg border">
      {times(rows, (index) => (
        <div key={index} className="flex items-center justify-between gap-4 px-3 py-3">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
      ))}
    </Loading>
  );
}

/** A state's page: its heading and button, then its visits. */
export function StateSkeleton() {
  return (
    <Loading className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-5 w-16" />
      <ListSkeleton rows={2} />
    </Loading>
  );
}

/** A form: labels with their fields, then the buttons. */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <Loading className="flex flex-col gap-4">
      {times(fields, (index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full pointer-coarse:h-11" />
        </div>
      ))}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Skeleton className="h-8 w-full pointer-coarse:h-11 sm:w-20" />
        <Skeleton className="h-8 w-full pointer-coarse:h-11 sm:w-24" />
      </div>
    </Loading>
  );
}

/** A form page whose heading also waits for the data ("Plan a trip in 2027"). */
export function TitledFormSkeleton() {
  return (
    <Loading className="flex flex-col gap-6">
      <Skeleton className="h-8 w-56" />
      <FormSkeleton />
    </Loading>
  );
}

/** The map page: the year filter, then the map (computers) or the cards (phones). */
export function MapSkeleton() {
  return (
    <Loading className="flex flex-col gap-4">
      <Skeleton className="h-7 w-64" />
      <div className="flex flex-col gap-3 sm:hidden">
        {times(4, (index) => <Skeleton key={index} className="h-36 w-full rounded-xl" />)}
      </div>
      <Skeleton className="hidden aspect-959/593 w-full rounded-xl sm:block" />
    </Loading>
  );
}

/** The years page: three year columns with a card each. */
export function YearsSkeleton() {
  return (
    <Loading className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {times(3, (index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl border p-3">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </Loading>
  );
}
