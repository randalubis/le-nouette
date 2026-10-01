// Pure pre-DB gates for the founder export routes (testable without a DB or the @/ alias).
import { isDatasetKey, type DatasetKey } from "./export.ts";
import { verifySessionCookieValue } from "./founder-auth.ts";

export const exportAuthError = (cookie: string | undefined): Response | null =>
  verifySessionCookieValue(cookie) ? null : new Response("Unauthorized", { status: 401 });

export const csvDatasetOrError = (cookie: string | undefined, dataset: string | null): DatasetKey | Response =>
  exportAuthError(cookie) ?? (isDatasetKey(dataset) ? dataset : new Response("Unknown dataset", { status: 400 }));
