// Which picture the account button shows (slice 22).

/** The signed-in person's profile picture (e.g. their Google photo), or null
 * for the plain person icon. Clerk gives everyone a made-up default picture
 * too; `hasImage` is only true for a real one, so the default isn't used.
 * `user` is null or undefined while Clerk is still loading. */
export function accountPicture(user: { hasImage: boolean; imageUrl: string } | null | undefined): string | null {
  return user?.hasImage ? user.imageUrl : null;
}
