// Loading screens: the pixel loader (blinking dots, a label saying what's on
// its way, and a timer) while a page's data loads. They keep their old
// "Skeleton" names, so the pages using them didn't change. Each one reserves
// about the height of what's coming, so the page jumps less when it arrives.
// Screen readers hear the label ("Loading map"), not the dots or the timer.

import LoadingState from "@/components/ui/loading-state";

/** The loader in the middle of a box of about the content's height, announced as `label`. */
function PageLoader({ label, className = "", minHeight }: { label: string; className?: string; minHeight?: string }) {
  return (
    <div role="status" aria-label={label} className={`flex items-center justify-center ${className}`} style={{ minHeight }}>
      <LoadingState label={label} />
    </div>
  );
}

/** The header's "12 of 50" counter: just the dots. */
export function CounterSkeleton() {
  return (
    <span role="status" aria-label="Loading" className="inline-flex px-4">
      <LoadingState compact />
    </span>
  );
}

/** The states list. */
export function StatesSkeleton() {
  return <PageLoader label="Loading states" className="min-h-96" />;
}

/** The trips list; `rows` sets how much room it keeps (about one trip per row). */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return <PageLoader label="Loading trips" minHeight={`${rows * 4}rem`} />;
}

/** A state's page: its heading, button and visits. */
export function StateSkeleton() {
  return <PageLoader label="Loading state" className="min-h-60" />;
}

/** A form; `fields` sets how much room it keeps. */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return <PageLoader label="Loading form" className={fields > 1 ? "min-h-80" : "min-h-32"} />;
}

/** A form page whose heading also waits for the data ("Plan a trip in 2027"). */
export function TitledFormSkeleton() {
  return <PageLoader label="Loading form" className="min-h-96" />;
}

/** The map page: the map on computers, the region cards on phones. */
export function MapSkeleton() {
  return <PageLoader label="Loading map" className="min-h-80 sm:aspect-959/593 sm:min-h-0" />;
}

/** The years page. */
export function YearsSkeleton() {
  return <PageLoader label="Loading years" className="min-h-80" />;
}
