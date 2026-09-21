import { db } from "./client";
import { loadState } from "./load-state";

export const getState = () => loadState(db);
