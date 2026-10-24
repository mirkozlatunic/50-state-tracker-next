"use client";
// The menu at the right end of the header. On a computer ("Account") it holds
// Share my map, Download backup, Manage account and Log out. On a phone ("Menu") it lists
// the pages too, because the page links don't fit in the header there.

import Image from "next/image";
import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { CircleUser, Download, LogOut, Menu, Share2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "cn";
import { accountPicture } from "@/lib/account-picture";
import { isCurrent, LINKS } from "@/lib/nav-links";

// On touch screens every item is at least 44px tall, big enough for a finger.
const ITEM = "pointer-coarse:min-h-11";

/** The header's menu. `phone`: the phone version (shown below 640px), otherwise the computer one.
 * `pathname` (the address you're on) marks the current page in the phone's list. */
export function NavMenu({ phone = false, pathname = "", className }: { phone?: boolean; pathname?: string; className?: string }) {
  // useClerk gives the signed-in session's controls: open account settings, sign out.
  const clerk = useClerk();
  // useUser gives the signed-in person; their profile picture (e.g. from
  // Google) replaces the person icon on the computer's Account button.
  const picture = accountPicture(useUser().user);
  return (
    <DropdownMenu>
      {/* Both versions are on the page; CSS shows the one that fits the screen. */}
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={phone ? "Menu" : "Account"}
            className={cn(phone ? "sm:hidden" : "max-sm:hidden", className)}
          />
        }
      >
        {phone ? (
          <Menu aria-hidden />
        ) : picture ? (
          <Image src={picture} alt="" width={28} height={28} sizes="28px" className="size-7 rounded-full object-cover" />
        ) : (
          <CircleUser aria-hidden />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-44">
        {phone && (
          <>
            {LINKS.map(({ href, label }) => (
              <DropdownMenuLinkItem
                key={href}
                render={<Link href={href} />}
                aria-current={isCurrent(pathname, href) ? "page" : undefined}
                className={cn(ITEM, "aria-[current=page]:font-semibold")}
              >
                {label}
              </DropdownMenuLinkItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLinkItem render={<Link href="/sharing" />} className={ITEM}>
          <Share2 aria-hidden />
          Share my map
        </DropdownMenuLinkItem>
        {/* A plain link on purpose: it downloads a file instead of opening a page. */}
        <DropdownMenuLinkItem href="/backup" download className={ITEM}>
          <Download aria-hidden />
          Download backup
        </DropdownMenuLinkItem>
        {/* Clerk's account settings (email, Google, sessions) in a pop-up. */}
        <DropdownMenuItem onClick={() => clerk.openUserProfile()} className={ITEM}>
          <UserCog aria-hidden />
          Manage account
        </DropdownMenuItem>
        {/* Signs this device out, then shows the sign-in page. */}
        <DropdownMenuItem onClick={() => clerk.signOut({ redirectUrl: "/sign-in" })} className={ITEM}>
          <LogOut aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
