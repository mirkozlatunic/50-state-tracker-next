// Slice 2: `pnpm set-password` saves the password hash and a new session secret
// in .env.local (which git ignores), keeping any other settings in that file.
import { describe, expect, test } from "vitest";
import { updateEnvFile } from "@/lib/auth/env-file";

const NEW = { PASSWORD_HASH: "scrypt:new", SESSION_SECRET: "new-secret" };

describe("saving the settings file", () => {
  test("an empty file gets both settings", () => {
    expect(updateEnvFile("", NEW)).toBe('PASSWORD_HASH="scrypt:new"\nSESSION_SECRET="new-secret"\n');
  });

  test("old values are replaced and other settings are kept", () => {
    const before = 'DATABASE_URL="file:local.sqlite"\nPASSWORD_HASH="scrypt:old"\nSESSION_SECRET="old"\n# a note\n';
    const after = updateEnvFile(before, NEW);
    expect(after).toContain('DATABASE_URL="file:local.sqlite"');
    expect(after).toContain("# a note");
    expect(after).toContain('PASSWORD_HASH="scrypt:new"');
    expect(after).not.toContain("old");
  });

  test("a setting whose name only starts the same is kept", () => {
    expect(updateEnvFile("PASSWORD_HASH_NOTE=keep\n", NEW)).toContain("PASSWORD_HASH_NOTE=keep");
  });
});
