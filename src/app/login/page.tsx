import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in · 50 States Tracker" };

// The login page: one password for the whole app.
export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl font-semibold">Log in</h1>
          </CardTitle>
          <CardDescription>You stay logged in on this device for 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* The form reads the address (?next=...), which needs a Suspense boundary. */}
          <Suspense>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
