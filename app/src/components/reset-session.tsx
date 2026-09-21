"use client";

import { resetSession } from "@/lib/session-store";

export function ResetSessionButton() {
  return <button className="btn btn-quiet" onClick={() => window.confirm("Reset semua data sesi ke data contoh?") && resetSession()}>Reset data</button>;
}
