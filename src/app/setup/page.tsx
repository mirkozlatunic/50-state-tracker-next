import type { Metadata } from "next";

export const metadata: Metadata = { title: "Set a password" };

// Shown on every page until a password is set (proxy.ts sends requests here).
export default function SetupPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Set a password first</h1>
      <p>This app doesn&apos;t have a password yet, so it stays closed.</p>
      <p>
        On the computer: open Terminal in the project folder, run <code className="font-mono">pnpm set-password</code>,
        then restart the app. Online: add <code className="font-mono">PASSWORD_HASH</code> and{" "}
        <code className="font-mono">SESSION_SECRET</code> in Vercel&apos;s settings.
      </p>
    </main>
  );
}
