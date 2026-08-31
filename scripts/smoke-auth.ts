/**
 * Auth smoke notes (manual / browser):
 *   OTP mock = 111111 by default (set ALLOW_MOCK_OTP=false to disable)
 *   Register: /register → name + phone → OTP → /app
 *   Login:    /login → phone → OTP → /app
 *
 * Known local quirk: use http://localhost:3003 (not 0.0.0.0) so session
 * cookies match across pages. COOKIE_SECURE follows NEXT_PUBLIC_APP_URL
 * (http:// → Secure=false) so `npm start` on localhost works.
 *
 * Run page checks: npx tsx scripts/smoke-auth.ts
 */
import "dotenv/config";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3003";

let passed = 0;
let failed = 0;

function pass(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function fail(label: string, detail: string) {
  failed += 1;
  console.error(`  ✗ ${label}: ${detail}`);
}

async function main() {
  console.log(`\nAuth page smoke @ ${BASE}\n`);

  for (const path of ["/login", "/register"] as const) {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    const body = await res.text();
    if (res.status === 200) pass(`GET ${path} → 200`);
    else fail(`GET ${path}`, `status=${res.status}`);

    if (path === "/login") {
      if (body.includes("خوش آمدید") || body.includes("ورود")) pass("login UI copy");
      else fail("login UI copy", "missing");
      if (body.includes("ثبت‌نام")) pass("login → register link");
      else fail("login → register link", "missing");
    } else {
      if (body.includes("شروع ساده") || body.includes("ثبت")) pass("register UI copy");
      else fail("register UI copy", "missing");
      if (body.includes("ورود")) pass("register → login link");
      else fail("register → login link", "missing");
    }
  }

  const { PASSWORD_MIN_LEN } = await import("../lib/password-policy");
  if (PASSWORD_MIN_LEN === 6) pass("PASSWORD_MIN_LEN === 6");
  else fail("PASSWORD_MIN_LEN", String(PASSWORD_MIN_LEN));

  const { cookieSecure } = await import("../lib/cookie-secure");
  // With default .env NEXT_PUBLIC_APP_URL=http://localhost:3003 → false
  console.log(`  · cookieSecure() = ${cookieSecure()}`);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
