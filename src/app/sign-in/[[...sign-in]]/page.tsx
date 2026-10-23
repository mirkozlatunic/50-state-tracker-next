import { Suspense } from "react";
import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { FormSkeleton } from "@/components/loading-skeletons";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = { title: "Sign in" };

// The sign-in page: Clerk's form (email code or Google). "[[...sign-in]]" is an
// optional catch-all folder, so Clerk's later steps (/sign-in/factor-one, ...)
// open this same page. Clerk reads the address, which needs a Suspense boundary.
export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <BrandLogo pixels={96} alt="50 States Tracker" />
      <Suspense fallback={<FormSkeleton fields={1} />}>
        <SignIn />
      </Suspense>
    </main>
  );
}
