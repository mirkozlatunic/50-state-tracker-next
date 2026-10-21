// Updating .env.local, the file of secret settings on this computer (git ignores it).
// Only plain code here (no "@/" imports), so `pnpm set-password` can use it too.

/** Set `values` in the text of an env file: replace those settings where they
 * are, add missing ones at the end, and keep every other line as it was. */
export function updateEnvFile(text: string, values: Record<string, string>): string {
  const names = Object.keys(values);
  const kept = text
    .split("\n")
    .filter((line) => line !== "" && !names.some((name) => line.startsWith(`${name}=`)));
  const added = names.map((name) => `${name}="${values[name]}"`);
  return [...kept, ...added].join("\n") + "\n";
}
