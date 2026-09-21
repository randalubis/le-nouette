import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// prepare:false is required against Supabase's transaction pooler, which doesn't support prepared statements.
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(sql, { schema });

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
