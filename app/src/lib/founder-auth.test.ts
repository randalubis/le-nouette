import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { createSessionCookieValue, verifySessionCookieValue } from "./founder-auth.ts";

const prev = process.env.ADMIN_SESSION_SECRET;
beforeEach(() => { process.env.ADMIN_SESSION_SECRET = "test-secret"; });
afterEach(() => {
  if (prev === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = prev;
});

test("valid cookie verifies", () => {
  assert.equal(verifySessionCookieValue(createSessionCookieValue()), true);
});

test("expired cookie is rejected", () => {
  const real = Date.now;
  Date.now = () => real() - 8 * 24 * 3600 * 1000;
  const cookie = createSessionCookieValue();
  Date.now = real;
  assert.equal(verifySessionCookieValue(cookie), false);
});

test("tampered payload or signature is rejected", () => {
  const cookie = createSessionCookieValue();
  const [, exp, sig] = cookie.split(".");
  assert.equal(verifySessionCookieValue(`founder.${Number(exp) + 1000}.${sig}`), false);
  assert.equal(verifySessionCookieValue(`${cookie.slice(0, -1)}${cookie.endsWith("0") ? "1" : "0"}`), false);
});

test("missing cookie or missing secret is rejected", () => {
  const cookie = createSessionCookieValue();
  assert.equal(verifySessionCookieValue(undefined), false);
  assert.equal(verifySessionCookieValue(""), false);
  delete process.env.ADMIN_SESSION_SECRET;
  assert.equal(verifySessionCookieValue(cookie), false);
});
