// `pnpm set-password`: asks for a new password (twice, without showing it) and
// saves its hash and a new random session secret in .env.local, which git
// ignores. A new secret logs every browser out. Restart the app afterwards.
// Online, paste the same two values into Vercel's settings.
//
// Node runs this TypeScript file directly (it strips the types).

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { updateEnvFile } from "../src/lib/auth/env-file.ts";
import { hashPasswordSync } from "../src/lib/auth/password.ts";

/** Ask a question in the terminal without showing what's typed. */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const input = process.stdin;
    process.stdout.write(question);
    input.setRawMode(true); // get each key press, and don't echo it
    input.resume();
    input.setEncoding("utf8");
    let answer = "";
    const onKey = (key: string) => {
      if (key === "\u0003") process.exit(1); // Ctrl+C
      if (key === "\r" || key === "\n") {
        input.setRawMode(false);
        input.pause();
        input.off("data", onKey);
        process.stdout.write("\n");
        resolve(answer);
      } else if (key === "\u007f") {
        answer = answer.slice(0, -1); // Backspace
      } else {
        answer += key;
      }
    };
    input.on("data", onKey);
  });
}

if (!process.stdin.isTTY) {
  console.error("Run this in a terminal window (like Terminal.app), so the password stays hidden.");
  process.exit(1);
}

const password = await askHidden("New password: ");
if (password.length < 8) {
  console.error("Please use at least 8 characters.");
  process.exit(1);
}
if ((await askHidden("Repeat it: ")) !== password) {
  console.error("The two passwords don't match. Nothing was saved.");
  process.exit(1);
}

const file = ".env.local";
const before = existsSync(file) ? readFileSync(file, "utf8") : "";
writeFileSync(
  file,
  updateEnvFile(before, { PASSWORD_HASH: hashPasswordSync(password), SESSION_SECRET: randomBytes(32).toString("hex") }),
);
console.log(`Saved in ${file}. Restart the app to use it.`);
