import { Suspense } from "react";
import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { FormSkeleton } from "@/components/loading-skeletons";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = { title: "Sign up" };

// The sign-up page for new people: Clerk's form (email code or Google).
// Works like the sign-in page (see src/app/sign-in).
export default function SignUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <BrandLogo pixels={96} alt="50 States Tracker" />
      <Suspense fallback={<FormSkeleton fields={1} />}>
        <SignUp />
      </Suspense>
    </main>
  );
}
