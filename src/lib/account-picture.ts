// What the account button shows (slice 22, 22b): your profile picture, the
// person icon, or an empty circle while Clerk is still loading.

// The button's picture is 28px; asking for twice that keeps it sharp on
// Retina screens.
const PICTURE_PIXELS = 56;

export type AccountButtonLook = { kind: "loading" } | { kind: "icon" } | { kind: "picture"; src: string };

/** How the account button looks. `isLoaded` and `user` come from Clerk's
 * useUser(): until Clerk has loaded we don't know yet, so an empty circle shows
 * (no icon that then flips to the photo). Clerk gives everyone a made-up
 * default picture too; `hasImage` is only true for a real one (e.g. Google's).
 * The picture comes from Clerk's own image server, which shrinks and crops it
 * when asked to in the address, so Vercel doesn't have to resize it. */
export function accountButtonLook(
  isLoaded: boolean,
  user: { hasImage: boolean; imageUrl: string } | null | undefined,
): AccountButtonLook {
  if (!isLoaded) return { kind: "loading" };
  if (!user?.hasImage) return { kind: "icon" };
  const src = new URL(user.imageUrl);
  src.searchParams.set("width", String(PICTURE_PIXELS));
  src.searchParams.set("height", String(PICTURE_PIXELS));
  src.searchParams.set("fit", "crop");
  return { kind: "picture", src: src.toString() };
}
