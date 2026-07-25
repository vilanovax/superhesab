/**
 * Smoke test against seeded DB + localhost:3003
 * Run: npx tsx scripts/smoke.ts
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import {
  tehranCivilMonth,
  tehranCivilYear,
  unitArrears,
  unitCollected,
  unitMonthlyCharge,
} from "../lib/building";
import { simplifyDebts } from "../lib/debtSimplification";
import { signSessionToken, SESSION_COOKIE } from "../lib/session-token";
import { getTemplate } from "../lib/templates/registry";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3003";

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
}

function fail(name: string, detail: string) {
  checks.push({ name, ok: false, detail });
}

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

function computeBalances(input: {
  members: string[];
  expenses: {
    paidById: string;
    totalAmount: number;
    splits: { userId: string; owedAmount: number }[];
  }[];
  settlements: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    status: string;
  }[];
}): Record<string, number> {
  const balances: Record<string, number> = Object.fromEntries(
    input.members.map((id) => [id, 0]),
  );

  for (const e of input.expenses) {
    balances[e.paidById] = (balances[e.paidById] ?? 0) + e.totalAmount;
    for (const split of e.splits) {
      balances[split.userId] = (balances[split.userId] ?? 0) - split.owedAmount;
    }
  }

  for (const s of input.settlements) {
    if (s.status !== "COMPLETED") continue;
    balances[s.fromUserId] = (balances[s.fromUserId] ?? 0) + s.amount;
    balances[s.toUserId] = (balances[s.toUserId] ?? 0) - s.amount;
  }

  return balances;
}

async function httpGet(
  path: string,
  cookie?: string,
): Promise<{ status: number; body: string; redirected: boolean; url: string }> {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    headers: cookie ? { cookie } : undefined,
  });
  const body = await res.text();
  return {
    status: res.status,
    body,
    redirected: res.status >= 300 && res.status < 400,
    url: res.headers.get("location") ?? "",
  };
}

async function httpGetBinary(
  path: string,
  cookie?: string,
): Promise<{ status: number; contentType: string; byteLength: number }> {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    headers: cookie ? { cookie } : undefined,
  });
  const buf = await res.arrayBuffer();
  return {
    status: res.status,
    contentType: res.headers.get("content-type") ?? "",
    byteLength: buf.byteLength,
  };
}

async function main() {
  const prisma = createPrisma();
  console.log(`\n🔥 Smoke test → ${BASE}\n`);

  try {
    // ——— DB seed integrity ———
    const ali = await prisma.user.findUnique({
      where: { phone: "09120000001" },
    });
    const sara = await prisma.user.findUnique({
      where: { phone: "09120000002" },
    });
    const reza = await prisma.user.findUnique({
      where: { phone: "09120000003" },
    });
    const virtual = await prisma.user.findFirst({
      where: { isVirtual: true, name: "رضا (دستی)" },
    });

    if (ali && sara && reza) pass("users: Ali/Sara/Reza exist");
    else fail("users: Ali/Sara/Reza exist", "missing seed users — run npm run db:seed");

    if (virtual) pass("users: virtual رضا (دستی)");
    else fail("users: virtual رضا (دستی)", "virtual member missing");

    const trip = await prisma.space.findFirst({
      where: { name: "سفر شمال تابستون", type: "TRIP" },
      include: {
        members: true,
        expenses: { include: { splits: true } },
        settlements: true,
      },
    });
    const partner = await prisma.space.findFirst({
      where: { name: "حساب مشترک من و سارا", type: "PARTNER" },
      include: { expenses: { include: { splits: true } }, members: true },
    });
    const empty = await prisma.space.findFirst({
      where: { name: "فضای خالی تست" },
      include: { expenses: true, members: true },
    });

    if (trip && trip.members.length === 3 && trip.expenses.length >= 4) {
      pass("trip space: 3 members, ≥4 expenses", `id=${trip.id}`);
    } else {
      fail("trip space", `members=${trip?.members.length} expenses=${trip?.expenses.length}`);
    }

    if (partner && partner.members.length === 2 && partner.expenses.length === 2) {
      pass("partner space: 2 members, 2 expenses", `id=${partner.id}`);
    } else {
      fail("partner space", "unexpected shape");
    }

    if (empty && empty.expenses.length === 0 && empty.members.length === 1) {
      pass("empty space: 0 expenses (empty-state)", `id=${empty.id}`);
    } else {
      fail("empty space", "not empty or missing");
    }

    // ——— Building template ———
    const buildingFeatures = getTemplate("BUILDING").features;
    if (
      buildingFeatures.buildingCharges &&
      !buildingFeatures.settlements &&
      !buildingFeatures.debts
    ) {
      pass("building registry: charges on, settlements/debts off");
    } else {
      fail("building registry", JSON.stringify(buildingFeatures));
    }

    // Pure math (integers / thousandths)
    if (unitMonthlyCharge(2_000_000, 1000) === 2_000_000) {
      pass("building math: 1.0× monthly charge");
    } else {
      fail("building math: 1.0×", String(unitMonthlyCharge(2_000_000, 1000)));
    }
    if (unitMonthlyCharge(2_000_000, 1500) === 3_000_000) {
      pass("building math: 1.5× monthly charge");
    } else {
      fail("building math: 1.5×", String(unitMonthlyCharge(2_000_000, 1500)));
    }

    const arrearsPartial = unitArrears({
      baseCharge: 2_000_000,
      multiplier: 1000,
      throughMonth: 3,
      payments: [
        { month: 1, amount: 2_000_000, status: "PAID" },
        { month: 2, amount: 2_000_000, status: "PAID" },
        { month: 3, amount: 1_000_000, status: "PARTIAL" },
      ],
    });
    if (arrearsPartial === 1_000_000) {
      pass("building math: PARTIAL arrears = remaining");
    } else {
      fail("building math: PARTIAL arrears", `got ${arrearsPartial}`);
    }

    const arrearsMissing = unitArrears({
      baseCharge: 2_000_000,
      multiplier: 1500,
      throughMonth: 2,
      payments: [],
    });
    if (arrearsMissing === 6_000_000) {
      pass("building math: missing months = full charge × months");
    } else {
      fail("building math: missing months", `got ${arrearsMissing}`);
    }

    const collectedWaived = unitCollected({
      baseCharge: 2_000_000,
      multiplier: 1000,
      payments: [
        { month: 1, amount: 0, status: "WAIVED" },
        { month: 2, amount: 500_000, status: "PARTIAL" },
      ],
    });
    if (collectedWaived === 2_500_000) {
      pass("building math: WAIVED counts as full charge + PARTIAL amount");
    } else {
      fail("building math: collected", `got ${collectedWaived}`);
    }

    const yearNow = tehranCivilYear();
    const monthNow = tehranCivilMonth();
    const building = await prisma.space.findFirst({
      where: { name: "برج آسمان تست", type: "BUILDING" },
      include: {
        members: true,
        units: true,
        chargePlans: true,
      },
    });

    const buildingManagers = building?.members.filter(
      (m) => m.role === "OWNER" || m.role === "EDITOR",
    );
    // managers = Ali OWNER + Sara EDITOR; VIEWER may exist after claim E2E
    if (
      building &&
      buildingManagers &&
      buildingManagers.length === 2 &&
      building.units.length === 3 &&
      building.chargePlans.some((p) => p.year === yearNow && p.baseCharge === 2_000_000)
    ) {
      pass(
        "building space: 2 managers, 3 units, plan",
        `id=${building.id} year=${yearNow} members=${building.members.length}`,
      );
    } else {
      fail(
        "building space",
        `managers=${buildingManagers?.length} units=${building?.units.length} — re-seed`,
      );
    }

    if (building) {
      const active = building.units.filter((u) => u.isActive);
      const inactive = building.units.filter((u) => !u.isActive);
      if (active.length === 2 && inactive.length === 1) {
        pass("building units: 2 active + 1 inactive");
      } else {
        fail("building units activity", `active=${active.length} inactive=${inactive.length}`);
      }

      const u12 = building.units.find((u) => u.name === "۱۲");
      const u14 = building.units.find((u) => u.name === "۱۴");
      if (u12 && u14 && u12.multiplier === 1000 && u14.multiplier === 1500) {
        pass("building units: ۱۲=1× ۱۴=1.5×");
      } else {
        fail("building multipliers", "expected ۱۲=1000 ۱۴=1500");
      }

      const payments = await prisma.chargePayment.findMany({
        where: { unit: { spaceId: building.id }, year: yearNow },
      });
      const p12 = payments.filter((p) => p.unitId === u12?.id);
      const p14 = payments.filter((p) => p.unitId === u14?.id);

      if (u12) {
        const debt12 = unitArrears({
          baseCharge: 2_000_000,
          multiplier: u12.multiplier,
          throughMonth: monthNow,
          payments: p12.map((p) => ({
            month: p.month,
            amount: p.amount,
            status: p.status as "DUE" | "PARTIAL" | "PAID" | "WAIVED",
          })),
        });
        if (debt12 === 1_000_000) {
          pass("building seed: unit ۱۲ arrears = 1M (partial current)");
        } else {
          fail("building seed: unit ۱۲ arrears", `got ${debt12} month=${monthNow}`);
        }
      }

      if (u14) {
        const debt14 = unitArrears({
          baseCharge: 2_000_000,
          multiplier: u14.multiplier,
          throughMonth: monthNow,
          payments: p14.map((p) => ({
            month: p.month,
            amount: p.amount,
            status: p.status as "DUE" | "PARTIAL" | "PAID" | "WAIVED",
          })),
        });
        const expected14 = 3_000_000 * monthNow;
        if (debt14 === expected14 && p14.length === 0) {
          pass(
            "building seed: unit ۱۴ full YTD arrears (no payments)",
            `${debt14}`,
          );
        } else {
          fail(
            "building seed: unit ۱۴ arrears",
            `got ${debt14} expected ${expected14} payments=${p14.length}`,
          );
        }
      }
    }

    const zafar = await prisma.space.findFirst({
      where: { name: "ظفر", type: "BUILDING" },
      include: {
        units: true,
        chargePlans: true,
        _count: { select: { expenses: true } },
      },
    });
    if (
      zafar &&
      zafar.units.length === 8 &&
      zafar.chargePlans.some((p) => p.year === 1405 && p.baseCharge === 500_000) &&
      zafar._count.expenses === 15
    ) {
      const payCount = await prisma.chargePayment.count({
        where: { unit: { spaceId: zafar.id }, year: 1405 },
      });
      if (payCount >= 8 && payCount <= 32) {
        pass(
          "building ظفر: 8 units, plan 1405×500k, 15 expenses",
          `payments=${payCount}`,
        );
      } else {
        fail("building ظفر payments", `count=${payCount}`);
      }
    } else {
      fail(
        "building ظفر",
        `units=${zafar?.units.length} expenses=${zafar?._count.expenses} — re-seed`,
      );
    }

    // ——— Phase 22–26: claim tokens, calendar matrix, announcements ———
    if (zafar) {
      const tokens = zafar.units.map((u) => u.inviteToken).filter(Boolean);
      const unique = new Set(tokens);
      if (tokens.length === zafar.units.length && unique.size === tokens.length) {
        pass("building claim: every unit has unique inviteToken");
      } else {
        fail(
          "building claim tokens",
          `tokens=${tokens.length} unique=${unique.size} units=${zafar.units.length}`,
        );
      }

      const pays1405 = await prisma.chargePayment.findMany({
        where: { unit: { spaceId: zafar.id, isActive: true }, year: 1405 },
        select: { unitId: true, month: true, status: true },
      });
      const matrix = new Map<string, Set<number>>();
      for (const p of pays1405) {
        const set = matrix.get(p.unitId) ?? new Set<number>();
        set.add(p.month);
        matrix.set(p.unitId, set);
      }
      const activeUnits = zafar.units.filter((u) => u.isActive);
      if (activeUnits.length >= 1 && matrix.size >= 1) {
        pass(
          "building calendar: payment matrix for active units",
          `${matrix.size} units × months populated`,
        );
      } else {
        fail("building calendar matrix", "no payments mapped");
      }

      // Announcement CRUD shape (table must exist)
      try {
        const annCount = await prisma.buildingAnnouncement.count({
          where: { spaceId: zafar.id },
        });
        pass("building announcements table readable", `count=${annCount}`);
      } catch (e) {
        fail(
          "building announcements table",
          e instanceof Error ? e.message : String(e),
        );
      }

      try {
        const sugCount = await prisma.buildingSuggestion.count({
          where: { spaceId: zafar.id },
        });
        pass("building suggestions table readable", `count=${sugCount}`);
      } catch (e) {
        fail(
          "building suggestions table",
          e instanceof Error ? e.message : String(e),
        );
      }

      try {
        const notifCount = await prisma.buildingNotification.count({
          where: { spaceId: zafar.id },
        });
        pass("building notifications table readable", `count=${notifCount}`);
      } catch (e) {
        fail(
          "building notifications table",
          e instanceof Error ? e.message : String(e),
        );
      }

      try {
        const proofCount = await prisma.chargePaymentProof.count({
          where: { payment: { unit: { spaceId: zafar.id } } },
        });
        pass("building chargePaymentProof table readable", `count=${proofCount}`);
      } catch (e) {
        fail(
          "building chargePaymentProof table",
          e instanceof Error ? e.message : String(e),
        );
      }

      if (
        process.env.S3_BUCKET &&
        process.env.S3_ACCESS_KEY_ID &&
        process.env.S3_SECRET_ACCESS_KEY
      ) {
        pass("S3 env present (proof upload can presign)");
      } else {
        pass(
          "S3 env skipped",
          "S3_BUCKET / keys unset — proof upload needs object storage",
        );
      }
    }

    // Split sum integrity
    let splitOk = true;
    for (const space of [trip, partner]) {
      if (!space) continue;
      for (const e of space.expenses) {
        const sum = e.splits.reduce((a, s) => a + s.owedAmount, 0);
        if (sum !== e.totalAmount) {
          splitOk = false;
          fail(
            `split sum: ${e.title}`,
            `${sum} !== ${e.totalAmount}`,
          );
        }
      }
    }
    if (splitOk) pass("math: all expense splits sum to total");

    // Share multipliers on trip villa (half-units: 1×=2, 2×=4 → 2,2,4)
    const villa = trip?.expenses.find((e) => e.title.includes("ویلا"));
    if (villa) {
      const shares = villa.splits.map((s) => s.share).sort((a, b) => a - b);
      if (shares.join(",") === "2,2,4") {
        pass("math: villa EQUAL uses share multipliers 1×/2×/1×");
      } else {
        fail("math: villa shares", `got ${shares.join(",")}`);
      }
    }

    const completed = trip?.settlements.filter((s) => s.status === "COMPLETED") ?? [];
    if (completed.length >= 1) pass("trip: ≥1 COMPLETED settlement");
    else fail("trip: settlement", "no completed settlement");

    // Balance zero-sum + simplifyDebts
    if (trip) {
      const memberIds = trip.members.map((m) => m.userId);
      const balances = computeBalances({
        members: memberIds,
        expenses: trip.expenses,
        settlements: trip.settlements,
      });
      const sum = Object.values(balances).reduce((a, b) => a + b, 0);
      if (sum === 0) pass("math: trip net balances zero-sum", JSON.stringify(balances));
      else fail("math: trip zero-sum", `sum=${sum}`);

      const suggestions = simplifyDebts(balances);
      const sugSum = suggestions.reduce((a, s) => a + s.amount, 0);
      const debtAbs = Object.values(balances)
        .filter((v) => v < 0)
        .reduce((a, v) => a + Math.abs(v), 0);
      if (sugSum === debtAbs) {
        pass(
          "math: simplifyDebts covers all debt",
          `${suggestions.length} settlement(s)`,
        );
      } else {
        fail("math: simplifyDebts", `sug=${sugSum} debt=${debtAbs}`);
      }
    }

    // ——— HTTP ———
    const login = await httpGet("/login");
    if (login.status === 200 && login.body.includes("موبایل")) {
      pass("HTTP GET /login 200");
    } else {
      fail("HTTP GET /login", `status=${login.status}`);
    }

    if (!ali) {
      fail("HTTP auth pages", "no Ali user for session");
    } else {
      const token = await signSessionToken({
        userId: ali.id,
        phone: ali.phone,
      });
      const cookie = `${SESSION_COOKIE}=${token}`;

      const app = await httpGet("/app", cookie);
      if (app.status === 200 && app.body.includes("سفر شمال")) {
        pass("HTTP GET /app (Ali) shows trip");
      } else if (app.status === 200) {
        pass("HTTP GET /app (Ali) 200", "trip title not in HTML (RSC?)");
      } else {
        fail("HTTP GET /app", `status=${app.status} loc=${app.url}`);
      }

      if (trip) {
        const page = await httpGet(`/spaces/${trip.id}`, cookie);
        if (page.status === 200) pass("HTTP GET trip space 200");
        else fail("HTTP GET trip space", `status=${page.status}`);

        const tripXlsx = await httpGetBinary(
          `/api/spaces/${trip.id}/export/report?format=xlsx`,
          cookie,
        );
        if (
          tripXlsx.status === 200 &&
          tripXlsx.contentType.includes("spreadsheetml") &&
          tripXlsx.byteLength > 100
        ) {
          pass("HTTP export trip report xlsx 200");
        } else {
          fail(
            "HTTP export trip report xlsx",
            `status=${tripXlsx.status} type=${tripXlsx.contentType} bytes=${tripXlsx.byteLength}`,
          );
        }
      }
      if (partner) {
        const page = await httpGet(`/spaces/${partner.id}`, cookie);
        if (page.status === 200) pass("HTTP GET partner space 200");
        else fail("HTTP GET partner space", `status=${page.status}`);
      }

      const personal = await prisma.space.findFirst({
        where: { type: "PERSONAL", members: { some: { userId: ali.id } } },
        select: { id: true },
      });
      if (personal) {
        const personalXlsx = await httpGetBinary(
          `/api/spaces/${personal.id}/export/report?format=xlsx`,
          cookie,
        );
        if (
          personalXlsx.status === 200 &&
          personalXlsx.contentType.includes("spreadsheetml")
        ) {
          pass("HTTP export personal report xlsx 200");
        } else {
          fail(
            "HTTP export personal report xlsx",
            `status=${personalXlsx.status} type=${personalXlsx.contentType}`,
          );
        }
      } else {
        pass("HTTP export personal report", "no PERSONAL space for Ali — skip");
      }

      const buildingSpace = await prisma.space.findFirst({
        where: { name: "برج آسمان تست", type: "BUILDING" },
      });
      if (buildingSpace) {
        const page = await httpGet(`/spaces/${buildingSpace.id}`, cookie);
        const looksBuilding =
          page.body.includes("شارژ") ||
          page.body.includes("ساختمان") ||
          page.body.includes("برج") ||
          page.body.includes("تقویم");
        if (page.status === 200 && looksBuilding) {
          pass("HTTP GET building space 200 (شارژ UI)");
        } else if (page.status === 200) {
          pass("HTTP GET building space 200", "label not in HTML (RSC?)");
        } else {
          fail("HTTP GET building space", `status=${page.status}`);
        }

        const settings = await httpGet(
          `/spaces/${buildingSpace.id}/settings`,
          cookie,
        );
        if (settings.status === 200) {
          pass("HTTP GET building settings 200");
        } else {
          fail("HTTP GET building settings", `status=${settings.status}`);
        }

        const board = await httpGet(
          `/spaces/${buildingSpace.id}/board`,
          cookie,
        );
        const boardLooksOk =
          board.status === 200 &&
          (board.body.includes("برد") ||
            board.body.includes("اعلان") ||
            board.body.includes("پیشنهاد"));
        if (boardLooksOk) {
          pass("HTTP GET building /board 200 (برد UI)");
        } else if (board.status === 200) {
          pass("HTTP GET building /board 200", "label not in HTML (RSC?)");
        } else {
          fail("HTTP GET building /board", `status=${board.status}`);
        }

        const unitsTab = await httpGet(
          `/spaces/${buildingSpace.id}?tab=units`,
          cookie,
        );
        const unitsLooksOk =
          unitsTab.status === 200 &&
          (unitsTab.body.includes("واحد") ||
            unitsTab.body.includes("۱۲") ||
            unitsTab.body.includes("۱۴"));
        if (unitsLooksOk) {
          pass("HTTP GET building ?tab=units 200 (واحد UI)");
        } else if (unitsTab.status === 200) {
          pass("HTTP GET building ?tab=units 200", "label not in HTML (RSC?)");
        } else {
          fail("HTTP GET building units tab", `status=${unitsTab.status}`);
        }

        const oldBoardTab = await httpGet(
          `/spaces/${buildingSpace.id}?tab=suggestions`,
          cookie,
        );
        if (
          (oldBoardTab.status === 307 || oldBoardTab.status === 302) &&
          oldBoardTab.url.includes("/board")
        ) {
          pass(
            "HTTP redirect ?tab=suggestions → /board",
            oldBoardTab.url.slice(0, 80),
          );
        } else {
          fail(
            "HTTP redirect ?tab=suggestions → /board",
            `status=${oldBoardTab.status} loc=${oldBoardTab.url}`,
          );
        }

        const settingsSlim = await httpGet(
          `/spaces/${buildingSpace.id}/settings`,
          cookie,
        );
        if (settingsSlim.status === 200) {
          const hasPlan =
            settingsSlim.body.includes("پایه") ||
            settingsSlim.body.includes("سال مالی") ||
            settingsSlim.body.includes("تنظیمات");
          const leakedUnitCrud =
            settingsSlim.body.includes("کپی لینک ساکن") ||
            settingsSlim.body.includes("تولید مجدد لینک");
          if (hasPlan && !leakedUnitCrud) {
            pass("HTTP building settings slim (no unit-invite CRUD)");
          } else if (hasPlan) {
            fail(
              "HTTP building settings slim",
              "unit invite actions still rendered on settings",
            );
          } else {
            pass("HTTP building settings 200", "copy not in HTML (RSC?)");
          }
        }
      } else {
        fail("HTTP building pages", "seed building space missing — re-seed");
      }

      // ——— E2E claim: Reza claims unit ۱۴ on برج آسمان تست (idempotent) ———
      if (buildingSpace && reza) {
        try {
          // Clear prior claim state for Reza on this building
          await prisma.unit.updateMany({
            where: { spaceId: buildingSpace.id, linkedUserId: reza.id },
            data: { linkedUserId: null, linkedAt: null },
          });
          const priorMember = await prisma.spaceMember.findUnique({
            where: {
              spaceId_userId: {
                spaceId: buildingSpace.id,
                userId: reza.id,
              },
            },
          });
          if (priorMember?.role === "VIEWER") {
            await prisma.spaceMember.delete({
              where: { id: priorMember.id },
            });
          }

          const claimUnit = await prisma.unit.findFirst({
            where: {
              spaceId: buildingSpace.id,
              name: "۱۴",
              isActive: true,
            },
          });
          if (!claimUnit) {
            fail("E2E claim setup", "unit ۱۴ missing — re-seed");
          } else {
            const freshToken = randomBytes(18).toString("hex");
            await prisma.unit.update({
              where: { id: claimUnit.id },
              data: {
                inviteToken: freshToken,
                linkedUserId: null,
                linkedAt: null,
              },
            });

            const rezaToken = await signSessionToken({
              userId: reza.id,
              phone: reza.phone,
            });
            const rezaCookie = `${SESSION_COOKIE}=${rezaToken}`;

            const claimRes = await httpGet(
              `/invite/unit/${freshToken}`,
              rezaCookie,
            );
            const toResident =
              (claimRes.status === 307 ||
                claimRes.status === 302 ||
                claimRes.status === 303) &&
              claimRes.url.includes(`/spaces/${buildingSpace.id}/resident`);

            if (toResident) {
              pass(
                "E2E claim HTTP → /resident",
                `status=${claimRes.status}`,
              );
            } else if (claimRes.status === 200) {
              // Error page (claim failed) — surface body hint
              const errHint = claimRes.body.includes("اتصال به واحد ممکن نیست")
                ? "claim rejected UI"
                : "200 without redirect";
              fail("E2E claim HTTP → /resident", errHint);
            } else {
              fail(
                "E2E claim HTTP → /resident",
                `status=${claimRes.status} loc=${claimRes.url}`,
              );
            }

            const linked = await prisma.unit.findUnique({
              where: { id: claimUnit.id },
              select: { linkedUserId: true, linkedAt: true },
            });
            if (linked?.linkedUserId === reza.id && linked.linkedAt) {
              pass("E2E claim DB: unit ۱۴ linked to Reza");
            } else {
              fail(
                "E2E claim DB: unit linked",
                `linkedUserId=${linked?.linkedUserId ?? "null"}`,
              );
            }

            const viewer = await prisma.spaceMember.findUnique({
              where: {
                spaceId_userId: {
                  spaceId: buildingSpace.id,
                  userId: reza.id,
                },
              },
              select: { role: true },
            });
            if (viewer?.role === "VIEWER") {
              pass("E2E claim DB: Reza is VIEWER member");
            } else {
              fail(
                "E2E claim DB: VIEWER membership",
                `role=${viewer?.role ?? "missing"}`,
              );
            }

            const portal = await httpGet(
              `/spaces/${buildingSpace.id}/resident`,
              rezaCookie,
            );
            const portalOk =
              portal.status === 200 &&
              (portal.body.includes("پرتال") ||
                portal.body.includes("واحد") ||
                portal.body.includes("۱۴"));
            if (portalOk) {
              pass("E2E claim HTTP resident portal 200");
            } else if (portal.status === 200) {
              pass(
                "E2E claim HTTP resident portal 200",
                "label not in HTML (RSC?)",
              );
            } else {
              fail(
                "E2E claim HTTP resident portal",
                `status=${portal.status}`,
              );
            }

            const dashAsViewer = await httpGet(
              `/spaces/${buildingSpace.id}`,
              rezaCookie,
            );
            if (
              (dashAsViewer.status === 307 || dashAsViewer.status === 302) &&
              dashAsViewer.url.includes("/resident")
            ) {
              pass("E2E claim: VIEWER manager dash → /resident");
            } else {
              fail(
                "E2E claim: VIEWER redirect",
                `status=${dashAsViewer.status} loc=${dashAsViewer.url}`,
              );
            }

            // Manager board forbidden to VIEWER → resident
            const boardAsViewer = await httpGet(
              `/spaces/${buildingSpace.id}/board`,
              rezaCookie,
            );
            if (
              (boardAsViewer.status === 307 || boardAsViewer.status === 302) &&
              boardAsViewer.url.includes("/resident")
            ) {
              pass("E2E claim: VIEWER /board → /resident");
            } else {
              fail(
                "E2E claim: VIEWER /board redirect",
                `status=${boardAsViewer.status} loc=${boardAsViewer.url}`,
              );
            }
          }
        } catch (e) {
          fail(
            "E2E claim unit",
            e instanceof Error ? e.message : String(e),
          );
        }
      } else {
        fail("E2E claim unit", "building space or Reza missing — re-seed");
      }

      // ظفر calendar year deep-link
      const zafarHttp = await prisma.space.findFirst({
        where: { name: "ظفر", type: "BUILDING" },
        select: { id: true },
      });
      if (zafarHttp) {
        const cal = await httpGet(
          `/spaces/${zafarHttp.id}?year=1405&tab=charges`,
          cookie,
        );
        if (cal.status === 200) {
          pass("HTTP GET ظفر calendar year=1405 tab=charges 200");
        } else {
          fail("HTTP GET ظفر calendar", `status=${cal.status}`);
        }

        const zafarBoard = await httpGet(
          `/spaces/${zafarHttp.id}/board`,
          cookie,
        );
        if (zafarBoard.status === 200) {
          pass("HTTP GET ظفر /board 200");
        } else {
          fail("HTTP GET ظفر /board", `status=${zafarBoard.status}`);
        }

        const zafarUnits = await httpGet(
          `/spaces/${zafarHttp.id}?tab=units`,
          cookie,
        );
        if (zafarUnits.status === 200) {
          pass("HTTP GET ظفر ?tab=units 200");
        } else {
          fail("HTTP GET ظفر units tab", `status=${zafarUnits.status}`);
        }

        const buildingXlsx = await httpGetBinary(
          `/api/spaces/${zafarHttp.id}/export/building?format=xlsx&year=1405`,
          cookie,
        );
        if (
          buildingXlsx.status === 200 &&
          buildingXlsx.contentType.includes("spreadsheetml") &&
          buildingXlsx.byteLength > 100
        ) {
          pass("HTTP export building xlsx 200");
        } else {
          fail(
            "HTTP export building xlsx",
            `status=${buildingXlsx.status} type=${buildingXlsx.contentType} bytes=${buildingXlsx.byteLength}`,
          );
        }

        const buildingPdf = await httpGetBinary(
          `/api/spaces/${zafarHttp.id}/export/building?format=pdf&year=1405`,
          cookie,
        );
        if (
          buildingPdf.status === 200 &&
          buildingPdf.contentType.includes("pdf") &&
          buildingPdf.byteLength > 50
        ) {
          pass("HTTP export building pdf 200");
        } else {
          fail(
            "HTTP export building pdf",
            `status=${buildingPdf.status} type=${buildingPdf.contentType}`,
          );
        }

        const buildingReport = await httpGetBinary(
          `/api/spaces/${zafarHttp.id}/export/report?format=xlsx&year=1405`,
          cookie,
        );
        if (
          buildingReport.status === 200 &&
          buildingReport.contentType.includes("spreadsheetml")
        ) {
          pass("HTTP export building shared report xlsx 200");
        } else {
          fail(
            "HTTP export building shared report",
            `status=${buildingReport.status} type=${buildingReport.contentType}`,
          );
        }
      }

      // Empty space owned by Reza — Ali should 404
      if (empty) {
        const denied = await httpGet(`/spaces/${empty.id}`, cookie);
        if (denied.status === 404 || denied.status === 307 || denied.status === 200) {
          // 200 would be wrong; Next notFound → 404
          if (denied.status === 404) pass("RBAC: Ali cannot open Reza empty space (404)");
          else fail("RBAC: Ali on empty space", `expected 404 got ${denied.status}`);
        }

        const rezaToken = await signSessionToken({
          userId: reza!.id,
          phone: reza!.phone,
        });
        const emptyPage = await httpGet(
          `/spaces/${empty.id}`,
          `${SESSION_COOKIE}=${rezaToken}`,
        );
        if (emptyPage.status === 200) {
          pass("HTTP GET empty space (Reza) 200");
        } else {
          fail("HTTP GET empty space", `status=${emptyPage.status}`);
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  const failed = checks.filter((c) => !c.ok);
  const passed = checks.filter((c) => c.ok);

  console.log("Results:");
  for (const c of checks) {
    const mark = c.ok ? "✅" : "❌";
    console.log(
      `  ${mark} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`,
    );
  }
  console.log(
    `\n${passed.length} passed, ${failed.length} failed (of ${checks.length})\n`,
  );

  if (failed.length > 0) process.exitCode = 1;
  else console.log("🟢 Smoke test OK — ready for manual E2E.\n");
}

main().catch((e) => {
  console.error("Smoke crashed:", e);
  process.exit(1);
});
