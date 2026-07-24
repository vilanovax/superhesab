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

  console.log("✅ Test data injected successfully. Ready for E2E manual testing.");
  console.log("");
  console.log("Login phones (OTP: 123456):");
  console.log(`  علی  → ${ali.phone}  (OWNER trip + partner)`);
  console.log(`  سارا → ${sara.phone}  (EDITOR)`);
  console.log(`  رضا  → ${reza.phone}  (OWNER empty space)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
