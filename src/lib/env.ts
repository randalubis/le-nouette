function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Returns just the origin (protocol + host) of a URL env var.
 * Strips trailing paths/slashes/whitespace so a paste of
 * "https://abc.supabase.co/rest/v1/" or "https://abc.supabase.co/"
 * still works. Throws a clear error if the value isn't a valid URL.
 */
function urlOrigin(name: string): string {
  const raw = required(name).trim();
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}`;
  } catch {
    throw new Error(
      `Invalid URL in ${name}: ${JSON.stringify(raw)}. Expected something like "https://<project>.supabase.co".`,
    );
  }
}

export const env = {
  databaseUrl: () => required("DATABASE_URL"),
  supabaseUrl: () => urlOrigin("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  storageBucket: () => process.env.SUPABASE_STORAGE_BUCKET ?? "le-nouette",
  adminEmail: () => required("ADMIN_EMAIL"),
  adminPassword: () => required("ADMIN_PASSWORD"),
  sessionSecret: () => required("ADMIN_SESSION_SECRET"),
  siteUrl: () =>
    (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
      .trim()
      .replace(/\/$/, ""),
  businessWhatsApp: () => (process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP ?? "").trim(),
};
