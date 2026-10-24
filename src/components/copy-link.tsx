"use client";
// The share link in a read-only box, with "Copy link" (which says "Copied" for a
// moment, or selects the link to copy by hand if the browser won't let it).

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CopyLink({ url }: { url: string }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [byHand, setByHand] = useState(false);

  /** Put the link on the clipboard, then show "Copied" for two seconds. If the
   * browser refuses, select the link so it can be copied by hand. */
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      input.current?.focus();
      input.current?.select();
      setByHand(true);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Share link</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        {/* Selecting all on focus makes it easy to copy by hand too. */}
        <Input ref={input} id={id} value={url} readOnly onFocus={(event) => event.target.select()} className="font-mono text-sm" />
        <Button type="button" onClick={copy} className="shrink-0">
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      {byHand && (
        <p role="status" className="text-sm text-muted-foreground">
          Press {/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl"}+C to copy the link.
        </p>
      )}
    </div>
  );
}
