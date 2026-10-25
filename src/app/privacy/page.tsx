import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = { title: "Privacy" };

// The privacy page (slice 24): what's stored, who can see it, where it lives,
// how to take it with you and how to delete it. Open without signing in, and
// outside the (app) folder, so it has no header. It shows no data, so it's a
// plain page built once (no database, no connection()).
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10">
      <Link href="/" aria-label="50 States Tracker" className="self-start">
        <BrandLogo pixels={48} />
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>

      <Section title="What's stored">
        Your sign-in details (such as your email address, or your Google account and its profile picture if you
        sign in with Google) are handled by Clerk, our sign-in service. This app stores what you add:
        your visits (state, date, city, note, story), your trips, the photos you add to visits, and a few settings (your
        milestones and, if you turn it on, your share link). Photos are shrunk in your browser before upload, which also
        removes their location data.
      </Section>

      <Section title="Who can see it">
        Only you. Nobody else can open your visits, trips or photos. If you turn on sharing, people with the link see
        which states you&apos;ve visited and how many. They don&apos;t see dates, notes, cities, trips, stories or
        photos. Stop sharing turns the link off at once.
      </Section>

      <Section title="Where it lives">
        Your data is in a Turso database and your photos in a private Vercel Blob store, both run for this app. Nothing is
        sold or shared with anyone else, and there&apos;s no advertising or tracking.
      </Section>

      <Section title="Taking it with you">
        &ldquo;Download backup&rdquo; in the account menu gives you a copy of your visits and trips at any time.
      </Section>

      <Section title="Deleting it">
        Open &ldquo;Manage account&rdquo; in the account menu and choose <strong>Delete account</strong>. Your account and
        everything you stored here (visits, trips, photos, settings and share link) are then deleted for good. This
        can&apos;t be undone, so download a backup first if you want one.
      </Section>
    </main>
  );
}

/** One part of the page: a heading and its paragraph. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="leading-relaxed text-muted-foreground">{children}</p>
    </section>
  );
}
