/**
 * Jalali (Shamsi) calendar helpers — integer math only, no Float money.
 * Used for building plan years and report date windows in Asia/Tehran.
 */

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

/** Convert Jalali Y/M/D → Gregorian Y/M/D (civil). */
export function jalaliToGregorian(
  jy: number,
  jm: number,
  jd: number,
): { gy: number; gm: number; gd: number } {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days =
    365 * jy +
    div(jy, 33) * 8 +
    div((jy % 33) + 3, 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const salA = [
    0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];
  let gm = 0;
  for (gm = 1; gm <= 12 && gd > salA[gm]!; gm++) {
    gd -= salA[gm]!;
  }
  return { gy, gm, gd };
}

function tehranDate(gy: number, gm: number, gd: number, endOfDay: boolean): Date {
  const mm = String(gm).padStart(2, "0");
  const dd = String(gd).padStart(2, "0");
  const time = endOfDay ? "T23:59:59.999+03:30" : "T00:00:00+03:30";
  return new Date(`${gy}-${mm}-${dd}${time}`);
}

/** Days in Jalali month (1–12). Esfand is 29, or 30 in leap years. */
export function jalaliDaysInMonth(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  // Leap: year % 33 in {1,5,9,13,17,22,26,30}
  const r = jy % 33;
  const leap = [1, 5, 9, 13, 17, 22, 26, 30].includes(r);
  return leap ? 30 : 29;
}

/** Inclusive Gregorian bounds for a full Jalali year (Tehran). */
export function jalaliYearBounds(jy: number): { start: Date; end: Date } {
  const s = jalaliToGregorian(jy, 1, 1);
  const last = jalaliDaysInMonth(jy, 12);
  const e = jalaliToGregorian(jy, 12, last);
  return {
    start: tehranDate(s.gy, s.gm, s.gd, false),
    end: tehranDate(e.gy, e.gm, e.gd, true),
  };
}

/** Inclusive Gregorian bounds for one Jalali month (Tehran). */
export function jalaliMonthBounds(
  jy: number,
  jm: number,
): { start: Date; end: Date } {
  const s = jalaliToGregorian(jy, jm, 1);
  const last = jalaliDaysInMonth(jy, jm);
  const e = jalaliToGregorian(jy, jm, last);
  return {
    start: tehranDate(s.gy, s.gm, s.gd, false),
    end: tehranDate(e.gy, e.gm, e.gd, true),
  };
}
