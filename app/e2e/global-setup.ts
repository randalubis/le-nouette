import { assertLocalE2eDb, resetDb } from "./db";

export default async function globalSetup() {
  assertLocalE2eDb(); // aborts the whole run unless DATABASE_URL is localhost/le_nouette_e2e
  await resetDb();
}
