/**
 * Whether session cookies should use the Secure flag.
 *
 * `npm start` sets NODE_ENV=production but often serves HTTP on localhost;
 * browsers drop Secure cookies on http:// — breaking login/register.
 *
 * Override with COOKIE_SECURE=true|false. Otherwise: false for http APP_URL,
 * true for production HTTPS deploys.
 */
export function cookieSecure(): boolean {
  const override = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (override === "true" || override === "1") return true;
  if (override === "false" || override === "0") return false;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "";
  if (appUrl.startsWith("http://")) return false;
  if (appUrl.startsWith("https://")) return true;

  return process.env.NODE_ENV === "production";
}
