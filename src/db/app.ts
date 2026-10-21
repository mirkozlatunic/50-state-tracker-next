// The app's own database (Turso online, a local file on the computer).
import { getDatabase } from "./index";
import { databaseConfig } from "@/lib/settings";

/** The app's database, set up and ready. */
export function appDatabase() {
  return getDatabase(databaseConfig());
}
