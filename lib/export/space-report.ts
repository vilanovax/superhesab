import "server-only";

import { prisma } from "@/lib/db/prisma";
import { simplifyDebts } from "@/lib/debtSimplification";
import { buildExcelBuffer, type ExcelSheetSpec } from "@/lib/export/excel";
import { buildPdfBuffer, type PdfTable } from "@/lib/export/pdf";
import { formatDateFaShort, type SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import {
  getExpenseLinesInRange,
  getExpensesByCategoryInRange,
} from "@/lib/reports-server";
import { getTemplate } from "@/lib/templates/registry";
import type { SpaceType } from "@/types";

export type SpaceReportExportInput = {
  spaceId: string;
  spaceName: string;
  spaceType: SpaceType;
  currency: SpaceCurrency;
  start: Date;
  end: Date;
  periodLabel: string;
};

async function loadBalancesWithNames(spaceId: string) {
  const members = await prisma.spaceMember.findMany({
    where: { spaceId },
    select: {
      userId: true,
      user: { select: { name: true } },
    },
  });

  const balances: Record<string, number> = {};
  for (const m of members) {
    balances[m.userId] = 0;
  }

  const expenses = await prisma.expense.findMany({
    where: { spaceId, transactionType: "EXPENSE" },
    select: {
      paidById: true,
      totalAmount: true,
      splits: { select: { userId: true, owedAmount: true } },
    },
  });

  for (const expense of expenses) {
    balances[expense.paidById] =
      (balances[expense.paidById] ?? 0) + expense.totalAmount;
    for (const split of expense.splits) {
      balances[split.userId] =
        (balances[split.userId] ?? 0) - split.owedAmount;
    }
  }

  const settlements = await prisma.settlement.findMany({
    where: { spaceId, status: "COMPLETED" },
    select: { fromUserId: true, toUserId: true, amount: true },
  });

  for (const s of settlements) {
    balances[s.fromUserId] = (balances[s.fromUserId] ?? 0) + s.amount;
    balances[s.toUserId] = (balances[s.toUserId] ?? 0) - s.amount;
  }

  const nameById = new Map(
    members.map((m) => [m.userId, m.user.name?.trim() || m.userId.slice(0, 8)]),
  );

  return { balances, nameById, suggestions: simplifyDebts(balances) };
}

export async function buildSpaceReportSheets(
  input: SpaceReportExportInput,
): Promise<ExcelSheetSpec[]> {
  const features = getTemplate(input.spaceType).features;
  const [categoryRows, lines] = await Promise.all([
    getExpensesByCategoryInRange(input.spaceId, input.start, input.end),
    getExpenseLinesInRange(input.spaceId, input.start, input.end),
  ]);

  const sheets: ExcelSheetSpec[] = [];

  sheets.push({
    name: "خلاصه",
    headers: ["فیلد", "مقدار"],
    rows: [
      ["فضا", input.spaceName],
      ["قالب", input.spaceType],
      ["بازه", input.periodLabel],
      [
        "جمع هزینه",
        formatCurrency(
          categoryRows.reduce((s, r) => s + r.amount, 0),
          input.currency,
        ),
      ],
      ["تعداد تراکنش", String(lines.length)],
    ],
  });

  sheets.push({
    name: "تراکنش‌ها",
    headers: ["تاریخ", "عنوان", "دسته", "مبلغ"],
    rows: lines.map((l) => [
      formatDateFaShort(l.date),
      l.title,
      l.categoryLabel?.trim() || l.category,
      formatCurrency(l.totalAmount, input.currency),
    ]),
  });

  sheets.push({
    name: "جمع دسته",
    headers: ["دسته", "مبلغ"],
    rows: categoryRows.map((r) => [
      r.label,
      formatCurrency(r.amount, input.currency),
    ]),
  });

  if (features.settlements) {
    const { balances, nameById, suggestions } = await loadBalancesWithNames(
      input.spaceId,
    );
    sheets.push({
      name: "تراز",
      headers: ["عضو", "مانده"],
      rows: Object.entries(balances).map(([userId, amount]) => [
        nameById.get(userId) ?? userId.slice(0, 8),
        formatCurrency(amount, input.currency),
      ]),
    });
    sheets.push({
      name: "پیشنهاد تسویه",
      headers: ["از", "به", "مبلغ"],
      rows: suggestions.map((s) => [
        nameById.get(s.fromUserId) ?? s.fromUserId.slice(0, 8),
        nameById.get(s.toUserId) ?? s.toUserId.slice(0, 8),
        formatCurrency(s.amount, input.currency),
      ]),
    });
  }

  if (features.budget || features.categoryBudgets) {
    const space = await prisma.space.findUnique({
      where: { id: input.spaceId },
      select: {
        monthlyBudget: true,
        categoryBudgets: {
          select: { category: true, amount: true },
        },
      },
    });
    const budgetRows: (string | number)[][] = [];
    if (features.budget && space?.monthlyBudget != null) {
      budgetRows.push([
        "بودجه ماهانه فضا",
        formatCurrency(space.monthlyBudget, input.currency),
      ]);
    }
    if (features.categoryBudgets) {
      for (const b of space?.categoryBudgets ?? []) {
        budgetRows.push([
          b.category,
          formatCurrency(b.amount, input.currency),
        ]);
      }
    }
    if (budgetRows.length > 0) {
      sheets.push({
        name: "بودجه",
        headers: ["مورد", "سقف"],
        rows: budgetRows,
      });
    }
  }

  return sheets;
}

export async function buildSpaceReportExcel(
  input: SpaceReportExportInput,
): Promise<Buffer> {
  const sheets = await buildSpaceReportSheets(input);
  return buildExcelBuffer({ creator: "SuperHesab", sheets });
}

export async function buildSpaceReportPdf(
  input: SpaceReportExportInput,
): Promise<Buffer> {
  const sheets = await buildSpaceReportSheets(input);
  const tables: PdfTable[] = sheets.map((s) => ({
    title: s.name,
    headers: s.headers,
    rows: s.rows.map((r) => r.map((c) => String(c ?? ""))),
  }));
  return buildPdfBuffer({
    title: `گزارش ${input.spaceName}`,
    subtitle: input.periodLabel,
    tables,
  });
}
