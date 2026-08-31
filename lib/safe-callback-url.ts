/**
 * Same-origin relative path only — blocks open redirects like `/\\evil.com`
 * (browsers / WHATWG treat backslash as `/`, yielding scheme-relative hosts).
 */
export function safeCallbackUrl(
  raw: string | undefined | null,
  fallback = "/app",
): string {
  if (!raw) return fallback;

  let decoded = raw;
  try {
    // Decode once so `%2F%5Cevil.com` / nested encodings still get inspected.
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }

  if (!decoded.startsWith("/")) return fallback;
  if (decoded.startsWith("//")) return fallback;
  if (decoded.includes("\\")) return fallback;
  if (decoded.includes("://")) return fallback;
  // Reject control chars / whitespace that can confuse parsers.
  if (/[\s\0-\x1f\x7f]/.test(decoded)) return fallback;

  return decoded;
}
