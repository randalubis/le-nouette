// Acceptance §19.6 item 38: proxy gates /founder/* without a browser.
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { NextRequest } from "next/server.js";
import { createSessionCookieValue, FOUNDER_SESSION_COOKIE } from "./lib/founder-auth.ts";
import { config, proxy } from "./proxy.ts";

const prev = process.env.ADMIN_SESSION_SECRET;
beforeEach(() => { process.env.ADMIN_SESSION_SECRET = "test-secret"; });
afterEach(() => {
  if (prev === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = prev;
});

const req = (cookie?: string) => new NextRequest("http://localhost/founder/orders", cookie === undefined ? {} : { headers: { cookie: `${FOUNDER_SESSION_COOKIE}=${cookie}` } });

test("no cookie, bad cookie, expired cookie -> redirect to /login", () => {
  const real = Date.now;
  Date.now = () => real() - 8 * 24 * 3600 * 1000;
  const expired = createSessionCookieValue();
  Date.now = real;
  for (const cookie of [undefined, "junk", expired]) {
    const res = proxy(req(cookie));
    assert.equal(res.status, 307);
    assert.equal(new URL(res.headers.get("location")!).pathname, "/login");
  }
});

test("valid cookie passes through", () => {
  const res = proxy(req(createSessionCookieValue()));
  assert.equal(res.headers.get("x-middleware-next"), "1");
  assert.equal(res.headers.get("location"), null);
});

test("matcher covers /founder/* and not / or /login", () => {
  const [pattern] = config.matcher;
  assert.equal(pattern, "/founder/:path*");
  const re = /^\/founder(?:\/.*)?$/; // equivalent of /founder/:path* (zero or more segments)
  for (const p of ["/founder", "/founder/orders", "/founder/export/csv"]) assert.ok(re.test(p), p);
  for (const p of ["/", "/login", "/founders"]) assert.ok(!re.test(p), p);
});
