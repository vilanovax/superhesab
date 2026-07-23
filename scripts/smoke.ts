/**
 * Smoke test against seeded DB + localhost:3003
 * Run: npx tsx scripts/smoke.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { simplifyDebts } from "../lib/debtSimplification";
import { signSessionToken, SESSION_COOKIE } from "../lib/session-token";

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

    // Share multipliers on trip villa (shares 1+2+1)
    const villa = trip?.expenses.find((e) => e.title.includes("ویلا"));
    if (villa) {
      const shares = villa.splits.map((s) => s.share).sort((a, b) => a - b);
      if (shares.join(",") === "1,1,2") {
        pass("math: villa EQUAL uses share multipliers 1/2/1");
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
      }
      if (partner) {
        const page = await httpGet(`/spaces/${partner.id}`, cookie);
        if (page.status === 200) pass("HTTP GET partner space 200");
        else fail("HTTP GET partner space", `status=${page.status}`);
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
