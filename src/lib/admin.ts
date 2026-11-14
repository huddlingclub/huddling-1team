import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

function credentials() {
  const id = process.env.ADMIN_ID || "";
  const password = process.env.ADMIN_PASSWORD || "";
  return id && password ? { id, password } : null;
}
function equal(a: string, b: string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}
export function adminCredentialsValid(id: string, password: string) {
  const c = credentials();
  return !!c && equal(id, c.id) && equal(password, c.password);
}
export function adminCookieValue() {
  const c = credentials();
  return c ? createHmac("sha256", c.password).update("huddling-admin:" + c.id).digest("hex") : null;
}
export function isAdmin(value: string | undefined) {
  const expected = adminCookieValue();
  return !!value && !!expected && equal(value, expected);
}
export function adminEventHash() {
  const token = process.env.HUDDLING_EVENT_TOKEN || "";
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? createHash("sha256").update(token).digest("hex") : null;
}
