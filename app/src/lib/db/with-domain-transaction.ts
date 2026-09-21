"use server";

import { sql } from "drizzle-orm";
import { db } from "./client";
import { loadState } from "./load-state";
import { diffAndWrite } from "./diff-and-write";
import * as op from "@/lib/domain/operations";

export async function withDomainTransaction(
  command: (state: op.State, now: Date) => op.State,
): Promise<{ error: string | null; state: op.State | null }> {
  try {
    let result: op.State | null = null;
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(1)`);
      const prev = await loadState(tx);
      const next = command(prev, new Date());
      await diffAndWrite(tx, prev, next);
      result = next;
    });
    return { error: null, state: result };
  } catch (error) {
    if (error instanceof op.DomainError) return { error: error.message, state: null };
    throw error;
  }
}
