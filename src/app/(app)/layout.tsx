import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// The frame around every page after logging in. The (app) folder is a "route
// group": it shares this layout without adding "/app" to the address. The
// login and setup pages live outside it, so they show no header or footer.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </>
  );
}
