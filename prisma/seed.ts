/**
 * Dev-only seed for E2E manual testing (UI, splits, empty states, roles).
 * Run: npx prisma db seed
 *
 * Login (mock OTP 123456):
 *   Ali  → 09120000001
 *   Sara → 09120000002
 *   Reza → 09120000003
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import {
  assertSplitsSumToTotal,
  asMoney,
  calculateWeightedSplits,
  type Money,
} from "../lib/money";

const AVATAR = "https://api.dicebear.com/9.x/thumbs/svg";

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

const prisma = createPrisma();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function avatarFor(seed: string): string {
  return `${AVATAR}?seed=${encodeURIComponent(seed)}`;
}

async function clearAll() {
  await prisma.chargePayment.deleteMany();
  await prisma.chargePlan.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.debtPayment.deleteMany();
  await prisma.debt.deleteMany();
  await prisma.recurringOccurrence.deleteMany();
  await prisma.recurringRule.deleteMany();
  await prisma.categoryBudget.deleteMany();
  await prisma.expenseSplit.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.spaceMember.deleteMany();
  await prisma.space.deleteMany();
  await prisma.user.deleteMany();
}

type SplitSeed = { userId: string; owedAmount: number; share: number };

async function createExpense(input: {
  spaceId: string;
  title: string;
  totalAmount: number;
  paidById: string;
  createdById: string;
  updatedById?: string;
  category:
    | "FOOD"
    | "TRANSPORT"
    | "ACCOMMODATION"
    | "ENTERTAINMENT"
    | "SHOPPING"
    | "OTHER";
  isCategoryLocked?: boolean;
  date: Date;
  splits: SplitSeed[];
}) {
  const total = asMoney(input.totalAmount);
  assertSplitsSumToTotal(
    total,
    input.splits.map((s) => asMoney(s.owedAmount) as Money),
  );

  return prisma.expense.create({
    data: {
      spaceId: input.spaceId,
      title: input.title,
      totalAmount: input.totalAmount,
      paidById: input.paidById,
      createdById: input.createdById,
      updatedById: input.updatedById ?? input.createdById,
      category: input.category,
      isCategoryLocked: input.isCategoryLocked ?? false,
      date: input.date,
      splits: {
        create: input.splits.map((s) => ({
          userId: s.userId,
          owedAmount: s.owedAmount,
          share: s.share,
        })),
      },
    },
  });
}

function weightedSplits(
  totalAmount: number,
  members: { userId: string; share: number }[],
): SplitSeed[] {
  return calculateWeightedSplits(totalAmount, members).map((row) => ({
    userId: row.userId,
    owedAmount: row.amount,
    share: row.share,
  }));
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: NODE_ENV=production");
  }

  console.log("🌱 Clearing existing data (dev only)…");
  await clearAll();

  console.log("🌱 Creating users…");
  const ali = await prisma.user.create({
    data: {
      name: "علی",
      phone: "09120000001",
      avatarUrl: avatarFor("ali"),
      isVirtual: false,
    },
  });
  const sara = await prisma.user.create({
    data: {
      name: "سارا",
      phone: "09120000002",
      avatarUrl: avatarFor("sara"),
      isVirtual: false,
    },
  });
  const reza = await prisma.user.create({
    data: {
      name: "رضا",
      phone: "09120000003",
      avatarUrl: avatarFor("reza"),
      isVirtual: false,
    },
  });
  const rezaVirtual = await prisma.user.create({
    data: {
      name: "رضا (دستی)",
      phone: "virtual-reza-north-trip",
      avatarUrl: avatarFor("reza-virtual"),
      isVirtual: true,
    },
  });

  // ——— Trip: سفر شمال تابستون ———
  console.log("🌱 Creating Trip space…");
  const trip = await prisma.space.create({
    data: {
      name: "سفر شمال تابستون",
      type: "TRIP",
      currency: "TOMAN",
      ownerId: ali.id,
      roundUpToThousand: false,
      members: {
        create: [
          { userId: ali.id, role: "OWNER", defaultShare: 2 },
          // Sara represents a couple → 2× (4 half-units)
          { userId: sara.id, role: "EDITOR", defaultShare: 4 },
          { userId: rezaVirtual.id, role: "EDITOR", defaultShare: 2 },
        ],
      },
      checklist: {
        create: [
          { title: "رزرو ویلا", isCompleted: true },
          { title: "خرید میان‌وعده برای جاده", isCompleted: false },
        ],
      },
    },
  });

  const tripMembers = [
    { userId: ali.id, share: 2 },
    { userId: sara.id, share: 4 },
    { userId: rezaVirtual.id, share: 2 },
  ];

  // 1) EQUAL + share multipliers — ویلا (Ali paid)
  await createExpense({
    spaceId: trip.id,
    title: "اجاره ویلا ۳ شب",
    totalAmount: 4_000_000,
    paidById: ali.id,
    createdById: ali.id,
    category: "ACCOMMODATION",
    isCategoryLocked: true,
    date: daysAgo(5),
    splits: weightedSplits(4_000_000, tripMembers),
  });

  // 2) EQUAL weighted — سوپرمارکت (Sara paid)
  await createExpense({
    spaceId: trip.id,
    title: "سوپرمارکت و خوراکی",
    totalAmount: 1_200_000,
    paidById: sara.id,
    createdById: sara.id,
    category: "FOOD",
    date: daysAgo(4),
    splits: weightedSplits(1_200_000, tripMembers),
  });

  // 3) EQUAL weighted — اسنپ فرودگاه (virtual Reza paid — odd but tests virtual payer)
  await createExpense({
    spaceId: trip.id,
    title: "اسنپ فرودگاه",
    totalAmount: 350_000,
    paidById: ali.id,
    createdById: ali.id,
    updatedById: sara.id,
    category: "TRANSPORT",
    date: daysAgo(3),
    splits: weightedSplits(350_000, [
      { userId: ali.id, share: 2 },
      { userId: sara.id, share: 2 },
      { userId: rezaVirtual.id, share: 2 },
    ]),
  });

  // 4) EXACT — بلیت قطار (custom amounts; shares = 1× → 2 half-units)
  const exactTotal = 900_000;
  const exactSplits: SplitSeed[] = [
    { userId: ali.id, owedAmount: 300_000, share: 2 },
    { userId: sara.id, owedAmount: 450_000, share: 2 },
    { userId: rezaVirtual.id, owedAmount: 150_000, share: 2 },
  ];
  await createExpense({
    spaceId: trip.id,
    title: "بلیت قطار رفت",
    totalAmount: exactTotal,
    paidById: sara.id,
    createdById: sara.id,
    category: "TRANSPORT",
    isCategoryLocked: true,
    date: daysAgo(2),
    splits: exactSplits,
  });

  // Completed settlement: Sara → Ali (partial, tests net-balance deduction)
  await prisma.settlement.create({
    data: {
      spaceId: trip.id,
      fromUserId: sara.id,
      toUserId: ali.id,
      amount: 500_000,
      status: "COMPLETED",
    },
  });

  // ——— Partner: حساب مشترک من و سارا ———
  console.log("🌱 Creating Partner space…");
  const partner = await prisma.space.create({
    data: {
      name: "حساب مشترک من و سارا",
      type: "PARTNER",
      currency: "TOMAN",
      ownerId: ali.id,
      members: {
        create: [
          { userId: ali.id, role: "OWNER", defaultShare: 2 },
          { userId: sara.id, role: "EDITOR", defaultShare: 2 },
        ],
      },
    },
  });

  const partnerPair = [
    { userId: ali.id, share: 2 },
    { userId: sara.id, share: 2 },
  ];

  await createExpense({
    spaceId: partner.id,
    title: "خرید خانه",
    totalAmount: 850_000,
    paidById: ali.id,
    createdById: ali.id,
    category: "SHOPPING",
    date: daysAgo(1),
    splits: weightedSplits(850_000, partnerPair),
  });

  await createExpense({
    spaceId: partner.id,
    title: "شام رستوران",
    totalAmount: 620_000,
    paidById: sara.id,
    createdById: sara.id,
    category: "FOOD",
    date: daysAgo(0),
    splits: weightedSplits(620_000, partnerPair),
  });

  // ——— Empty space (Phase 12 empty states) ———
  console.log("🌱 Creating empty space…");
  await prisma.space.create({
    data: {
      name: "فضای خالی تست",
      type: "TRIP",
      currency: "TOMAN",
      ownerId: reza.id,
      members: {
        create: [{ userId: reza.id, role: "OWNER", defaultShare: 2 }],
      },
    },
  });

  // ——— Building smoke: برج آسمان تست (deterministic) ———
  console.log("🌱 Creating Building smoke space…");
  const jalaliParts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const planYear = Number(jalaliParts.find((p) => p.type === "year")?.value);
  const planMonth = Number(jalaliParts.find((p) => p.type === "month")?.value);

  const building = await prisma.space.create({
    data: {
      name: "برج آسمان تست",
      type: "BUILDING",
      currency: "TOMAN",
      ownerId: ali.id,
      members: {
        create: [
          { userId: ali.id, role: "OWNER", defaultShare: 2 },
          { userId: sara.id, role: "EDITOR", defaultShare: 2 },
        ],
      },
    },
  });

  const smokeBase = 2_000_000;
  await prisma.chargePlan.create({
    data: {
      spaceId: building.id,
      year: planYear,
      baseCharge: smokeBase,
    },
  });

  const unit12 = await prisma.unit.create({
    data: {
      spaceId: building.id,
      name: "۱۲",
      area: 95,
      multiplier: 1000,
      isActive: true,
    },
  });
  const unit14 = await prisma.unit.create({
    data: {
      spaceId: building.id,
      name: "۱۴",
      area: 140,
      multiplier: 1500,
      isActive: true,
    },
  });
  await prisma.unit.create({
    data: {
      spaceId: building.id,
      name: "۱۵",
      area: 80,
      multiplier: 1000,
      isActive: false,
    },
  });

  for (let month = 1; month < planMonth; month++) {
    await prisma.chargePayment.create({
      data: {
        unitId: unit12.id,
        year: planYear,
        month,
        amount: smokeBase,
        status: "PAID",
        date: daysAgo(planMonth - month),
        createdById: ali.id,
      },
    });
  }
  if (planMonth >= 1) {
    await prisma.chargePayment.create({
      data: {
        unitId: unit12.id,
        year: planYear,
        month: planMonth,
        amount: 1_000_000,
        status: "PARTIAL",
        date: daysAgo(0),
        createdById: ali.id,
        note: "نیمه‌پرداخت تست",
      },
    });
  }

  // ——— Building demo: ظفر (۸ واحد + شارژ ۱۴۰۵ + ۱۵ هزینه) ———
  console.log("🌱 Creating Building «ظفر» demo…");
  const ZAFAR_YEAR = 1405;
  const ZAFAR_CHARGE = 500_000;

  function randInt(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
  }
  function pick<T>(items: T[]): T {
    return items[randInt(0, items.length - 1)]!;
  }
  function pickMonths(count: number): number[] {
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    return pool.slice(0, count).sort((a, b) => a - b);
  }
  /** Approximate Gregorian midday for Jalali 1405 month/day (demo dates). */
  function dateIn1405(month: number, day: number): Date {
    // 1405/1/1 ≈ 2026-03-21; months ~31/31/31/31/31/31/30/30/30/30/30/29
    const lengths = [0, 31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    let offset = 0;
    for (let m = 1; m < month; m++) offset += lengths[m]!;
    offset += Math.min(Math.max(day, 1), lengths[month]!) - 1;
    const d = new Date(Date.UTC(2026, 2, 21, 9, 0, 0));
    d.setUTCDate(d.getUTCDate() + offset);
    return d;
  }

  const zafar = await prisma.space.create({
    data: {
      name: "ظفر",
      type: "BUILDING",
      currency: "TOMAN",
      ownerId: ali.id,
      members: {
        create: [
          { userId: ali.id, role: "OWNER", defaultShare: 2 },
          { userId: sara.id, role: "EDITOR", defaultShare: 2 },
        ],
      },
    },
  });

  await prisma.chargePlan.create({
    data: {
      spaceId: zafar.id,
      year: ZAFAR_YEAR,
      baseCharge: ZAFAR_CHARGE,
    },
  });

  const unitNames = ["۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸"];
  const areas = [75, 90, 95, 110, 120, 85, 140, 100];
  const zafarUnits: { id: string; name: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const unit = await prisma.unit.create({
      data: {
        spaceId: zafar.id,
        name: unitNames[i]!,
        area: areas[i]!,
        multiplier: 1000,
        isActive: true,
      },
    });
    zafarUnits.push(unit);
    const months = pickMonths(randInt(1, 4));
    for (const month of months) {
      await prisma.chargePayment.create({
        data: {
          unitId: unit.id,
          year: ZAFAR_YEAR,
          month,
          amount: ZAFAR_CHARGE,
          status: "PAID",
          date: dateIn1405(month, randInt(5, 25)),
          createdById: pick([ali.id, sara.id]),
          note: `وصول واحد ${unit.name}`,
        },
      });
    }
  }

  const expenseCatalog: {
    title: string;
    category:
      | "FOOD"
      | "TRANSPORT"
      | "ACCOMMODATION"
      | "ENTERTAINMENT"
      | "SHOPPING"
      | "OTHER";
    amount: number;
  }[] = [
    { title: "قبض برق مشاع", category: "OTHER", amount: 2_800_000 },
    { title: "قبض آب مشاع", category: "OTHER", amount: 1_450_000 },
    { title: "گاز موتورخانه", category: "OTHER", amount: 3_200_000 },
    { title: "حقوق سرایدار", category: "OTHER", amount: 12_000_000 },
    { title: "مواد شوینده و نظافت", category: "SHOPPING", amount: 680_000 },
    { title: "تعمیر آسانسور", category: "OTHER", amount: 4_500_000 },
    { title: "باغبانی حیاط", category: "OTHER", amount: 1_100_000 },
    { title: "سم‌پاشی انباری", category: "OTHER", amount: 750_000 },
    { title: "خرید لامپ راه‌پله", category: "SHOPPING", amount: 420_000 },
    { title: "حمل نخاله ساختمانی", category: "TRANSPORT", amount: 900_000 },
    { title: "پذیرایی مجمع عمومی", category: "FOOD", amount: 1_850_000 },
    { title: "رنگ‌آمیزی لابی", category: "OTHER", amount: 6_700_000 },
    { title: "بیمه آتش‌سوزی", category: "OTHER", amount: 5_400_000 },
    { title: "سرویس کولر پشت‌بام", category: "OTHER", amount: 2_200_000 },
    { title: "دورهمی نگهبانی نوروز", category: "ENTERTAINMENT", amount: 1_300_000 },
    { title: "تعویض قفل پارکینگ", category: "SHOPPING", amount: 560_000 },
    { title: "کپسول آتش‌نشانی", category: "SHOPPING", amount: 980_000 },
    { title: "هزینه اینترنت لابی", category: "OTHER", amount: 450_000 },
  ];

  const expensePicks = [...expenseCatalog]
    .sort(() => Math.random() - 0.5)
    .slice(0, 15);

  for (const item of expensePicks) {
    const month = randInt(1, 4);
    const payerId = pick([ali.id, sara.id]);
    await createExpense({
      spaceId: zafar.id,
      title: item.title,
      totalAmount: item.amount,
      paidById: payerId,
      createdById: payerId,
      category: item.category,
      isCategoryLocked: true,
      date: dateIn1405(month, randInt(1, 28)),
      // Building common cost: 100% on payer (same as household ledger)
      splits: [
        { userId: payerId, owedAmount: item.amount, share: 2 },
      ],
    });
  }

  const zafarPayments = await prisma.chargePayment.count({
    where: { unit: { spaceId: zafar.id } },
  });

  console.log("✅ Test data injected successfully. Ready for E2E manual testing.");
  console.log("");
  console.log("Login phones (OTP: 123456):");
  console.log(`  علی  → ${ali.phone}  (OWNER trip + partner + building)`);
  console.log(`  سارا → ${sara.phone}  (EDITOR)`);
  console.log(`  رضا  → ${reza.phone}  (OWNER empty space)`);
  console.log("");
  console.log(
    `Building «برج آسمان تست»: plan ${planYear} base=${smokeBase}, units ۱۲/۱۴/۱۵(inactive), month=${planMonth}`,
  );
  console.log(`  unit14 id=${unit14.id} (unpaid — debtor)`);
  console.log(
    `Building «ظفر»: year=${ZAFAR_YEAR} charge=${ZAFAR_CHARGE}, units=${zafarUnits.length}, payments=${zafarPayments}, expenses=15`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
