// GET /backup: download the backup file (logged in only; proxy.ts and
// requireLogin both check). Made in a temporary folder, sent, then deleted.

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connection } from "next/server";
import { appDatabase } from "@/db/app";
import { requireLogin } from "@/lib/auth/server";
import { backupFileName, writeBackup } from "@/lib/backup";
import { todayIn } from "@/lib/dates";

export async function GET() {
  await connection(); // a fresh copy on every download, never one made at build time
  await requireLogin();
  const folder = mkdtempSync(join(tmpdir(), "tracker-backup-"));
  try {
    const file = join(folder, "backup.sqlite");
    await writeBackup(await appDatabase(), file);
    return new Response(readFileSync(file), {
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        // "attachment" makes the browser save the file instead of showing it.
        "Content-Disposition": `attachment; filename="${backupFileName(todayIn())}"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}
