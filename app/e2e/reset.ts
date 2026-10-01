import { resetDb } from "./db";
resetDb().then(() => console.log("e2e DB reset + seeded"), (e) => { console.error(e); process.exit(1); });
