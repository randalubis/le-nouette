import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { checkCredentials, createSessionCookieValue, verifySessionCookieValue } from "./founder-auth.ts";

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

test("checkCredentials: right/wrong email and password, any length", () => {
  const keep = [process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD];
  try {
    process.env.ADMIN_EMAIL = "founder@example.com"; process.env.ADMIN_PASSWORD = "s3cret-pass";
    assert.equal(checkCredentials("founder@example.com", "s3cret-pass"), true);
    assert.equal(checkCredentials("other@example.com", "s3cret-pass"), false);
    assert.equal(checkCredentials("founder@example.com", "wrong"), false);
    assert.equal(checkCredentials("", ""), false);
    assert.equal(checkCredentials("x".repeat(5000), "y".repeat(5000)), false); // differing lengths do not throw
    delete process.env.ADMIN_PASSWORD;
    assert.equal(checkCredentials("founder@example.com", ""), false); // missing env never matches
    delete process.env.ADMIN_EMAIL;
    assert.equal(checkCredentials("", ""), false);
  } finally {
    for (const [k, v] of [["ADMIN_EMAIL", keep[0]], ["ADMIN_PASSWORD", keep[1]]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});
