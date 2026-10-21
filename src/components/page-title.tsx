/** The big heading at the top of a page. */
export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>;
}

/** The frame of a page's content: centered, with the same side gutters everywhere. */
export function PageBody({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <main className={`mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-8 ${narrow ? "max-w-lg" : "max-w-5xl"}`}>
      {children}
    </main>
  );
}
