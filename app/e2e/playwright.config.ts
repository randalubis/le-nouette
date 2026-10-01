import { defineConfig, devices } from "@playwright/test";
import { E2E_URL } from "./db";

// Hard-wired to the local e2e DB: never inherits DATABASE_URL from the shell or .env.local (process env wins over .env.local in Next).
process.env.DATABASE_URL = E2E_URL;
const PORT = 3100;
export const ADMIN = { email: "e2e@test.local", password: "e2e-pass" };

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  globalSetup: "./global-setup.ts",
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  use: { baseURL: `http://localhost:${PORT}`, channel: "chrome", headless: true, trace: "retain-on-failure" },
  outputDir: "../test-results",
  projects: [
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: devices["iPhone 13"].userAgent } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    cwd: "..",
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false, // never adopt a server started with other env (could point at prod)
    timeout: 120_000,
    env: {
      DATABASE_URL: E2E_URL,
      ADMIN_EMAIL: ADMIN.email,
      ADMIN_PASSWORD: ADMIN.password,
      ADMIN_SESSION_SECRET: "e2e-secret",
      NEXT_PUBLIC_WHATSAPP_NUMBER: "6281234567890",
    },
  },
});
