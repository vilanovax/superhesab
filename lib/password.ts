import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { PASSWORD_MAX_LEN, PASSWORD_MIN_LEN } from "@/lib/password-policy";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
/** Format: scrypt$N$r$p$saltB64$hashB64 */
const PREFIX = "scrypt";

export { PASSWORD_MAX_LEN, PASSWORD_MIN_LEN };

export function validatePasswordPlain(password: string): string | null {
  const p = password.normalize("NFKC");
  if (p.length < PASSWORD_MIN_LEN) {
    return `رمز باید حداقل ${PASSWORD_MIN_LEN} کاراکتر باشد.`;
  }
  if (p.length > PASSWORD_MAX_LEN) {
    return `رمز نباید بیشتر از ${PASSWORD_MAX_LEN} کاراکتر باشد.`;
  }
  if (/\s/.test(p)) {
    return "رمز نباید فاصله داشته باشد.";
  }
  return null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize("NFKC"), salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return [
    PREFIX,
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

export function verifyPassword(
  password: string,
  encoded: string | null | undefined,
): boolean {
  if (!encoded) return false;
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== PREFIX) return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4]!, "base64");
  const expected = Buffer.from(parts[5]!, "base64");
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }
  const actual = scryptSync(password.normalize("NFKC"), salt, expected.length, {
    N: n,
    r,
    p,
  });
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
