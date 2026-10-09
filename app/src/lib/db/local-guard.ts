// Pure helper (no server-only / DB imports) so scripts, tests and server actions can share it.
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]", "::1"];

export function isLocalDb(url: string | undefined): boolean {
  try { return LOCAL_HOSTS.includes(new URL(url ?? "").hostname); } catch { return false; }
}

/** Throws unless the URL points at this machine. Never echoes the URL (it may hold credentials). */
export function assertLocalDb(url: string | undefined): void {
  if (!isLocalDb(url)) throw new Error("Refusing to run: DATABASE_URL must point at localhost / 127.0.0.1 / ::1 (never a remote or production database).");
}
