"use client";
// The password form. A client component, so it can show the error message
// without reloading, and read ?next=... from the address.

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logIn, type LoginState } from "./actions";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "";
  // useActionState runs the action and keeps what it returned (the error) between tries.
  const [state, action, pending] = useActionState<LoginState, FormData>(logIn, { error: null });

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {state.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        {/* autocomplete="current-password" lets the iPhone offer a saved password. */}
        <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        Log in
      </Button>
    </form>
  );
}
