import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { canonicalizeSpaceType } from "@/lib/templates/registry";
import type {
  BackupSpacePayload,
  RestoreSpaceResult,
} from "@/lib/backup/types";
import type {
  ChargeStatus,
  ExpenseCategory,
  SpaceCurrency,
  SpaceRole,
  SpaceType,
  TransactionType,
} from "@/lib/generated/prisma/enums";

function parseDate(value: string | null | undefined, fallback = new Date()): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

async function buildUserMap(
  payload: BackupSpacePayload,
  restorerUserId: string,
): Promise<{ userMap: Map<string, string>; warnings: string[] }> {
  const userMap = new Map<string, string>();
  const warnings: string[] = [];
  userMap.set(restorerUserId, restorerUserId);

  for (const m of payload.members) {
    if (userMap.has(m.originalUserId)) continue;

    if (m.originalUserId === restorerUserId) {
      userMap.set(m.originalUserId, restorerUserId);
      continue;
    }

    const treatAsVirtual =
      m.user.isVirtual || m.user.phone.startsWith("virtual_");

    if (!treatAsVirtual) {
      const existing = await prisma.user.findUnique({
        where: { phone: m.user.phone },
        select: { id: true },
      });
      if (existing) {
        userMap.set(m.originalUserId, existing.id);
        continue;
      }
    }

    const name =
      m.user.name?.trim() ||
      (treatAsVirtual ? "عضو بازیابی‌شده" : `عضو ${m.user.phone.slice(-4)}`);
    const created = await prisma.user.create({
      data: {
        phone: `virtual_${randomUUID().replace(/-/g, "")}`,
        name: name.slice(0, 40),
        isVirtual: true,
      },
      select: { id: true },
    });
    userMap.set(m.originalUserId, created.id);
    if (!treatAsVirtual) {
      warnings.push(
        `کاربر ${m.user.phone} در سیستم نبود؛ به‌صورت مجازی بازیابی شد.`,
      );
    }
  }

  return { userMap, warnings };
}

export async function restoreSpaceFromBackup(input: {
  payload: BackupSpacePayload;
  restorerUserId: string;
}): Promise<RestoreSpaceResult> {
  const { userMap, warnings } = await buildUserMap(
    input.payload,
    input.restorerUserId,
  );

  const memberMap = new Map<string, string>();
  const expenseMap = new Map<string, string>();
  const unitMap = new Map<string, string>();

  const restoredName = `${input.payload.name} (بازیابی)`.slice(0, 120);
  const spaceType = canonicalizeSpaceType(input.payload.type as SpaceType);
  const currency = input.payload.currency as SpaceCurrency;

  const mapUser = (originalUserId: string): string =>
    userMap.get(originalUserId) ?? input.restorerUserId;

  const spaceId = await prisma.$transaction(
    async (tx) => {
      const space = await tx.space.create({
        data: {
          name: restoredName,
          type: spaceType,
          currency,
          roundUpToThousand: input.payload.roundUpToThousand,
          monthlyBudget: input.payload.monthlyBudget,
          defaultPlanYear: input.payload.defaultPlanYear,
          archivedAt: null,
          ownerId: input.restorerUserId,
        },
        select: { id: true },
      });

      const ownerShare =
        input.payload.members.find(
          (m) => mapUser(m.originalUserId) === input.restorerUserId,
        )?.defaultShare ?? 2;

      const ownerMember = await tx.spaceMember.create({
        data: {
          spaceId: space.id,
          userId: input.restorerUserId,
          role: "OWNER",
          defaultShare: ownerShare,
        },
        select: { id: true },
      });

      for (const m of input.payload.members) {
        const newUserId = mapUser(m.originalUserId);
        if (newUserId === input.restorerUserId) {
          memberMap.set(m.originalMemberId, ownerMember.id);
          continue;
        }
        if (memberMap.has(m.originalMemberId)) continue;

        const already = await tx.spaceMember.findUnique({
          where: {
            spaceId_userId: { spaceId: space.id, userId: newUserId },
          },
          select: { id: true },
        });
        if (already) {
          memberMap.set(m.originalMemberId, already.id);
          continue;
        }

        const role: SpaceRole =
          m.role === "OWNER" ? "EDITOR" : (m.role as SpaceRole);

        const created = await tx.spaceMember.create({
          data: {
            spaceId: space.id,
            userId: newUserId,
            role,
            defaultShare: m.defaultShare,
          },
          select: { id: true },
        });
        memberMap.set(m.originalMemberId, created.id);
      }

      const mapMember = (originalMemberId: string) =>
        memberMap.get(originalMemberId) ?? null;

      for (const e of input.payload.expenses) {
        const created = await tx.expense.create({
          data: {
            spaceId: space.id,
            title: e.title,
            totalAmount: e.totalAmount,
            paidById: mapUser(e.paidByOriginalUserId),
            createdById: e.createdByOriginalUserId
              ? mapUser(e.createdByOriginalUserId)
              : input.restorerUserId,
            transactionType: e.transactionType as TransactionType,
            category: e.category as ExpenseCategory,
            categoryLabel: e.categoryLabel,
            isCategoryLocked: e.isCategoryLocked,
            date: parseDate(e.date),
            splitMode:
              e.splitMode === "EXACT" || e.splitMode === "PERCENT"
                ? e.splitMode
                : "EQUAL",
            splits: {
              create: e.splits.map((s) => ({
                userId: mapUser(s.originalUserId),
                owedAmount: s.owedAmount,
                share:
                  typeof s.share === "number" && Number.isInteger(s.share)
                    ? s.share
                    : 2,
                percent:
                  typeof s.percent === "number" && Number.isInteger(s.percent)
                    ? s.percent
                    : null,
              })),
            },
          },
          select: { id: true },
        });
        expenseMap.set(e.originalId, created.id);
      }

      for (const s of input.payload.settlements) {
        await tx.settlement.create({
          data: {
            spaceId: space.id,
            fromUserId: mapUser(s.fromOriginalUserId),
            toUserId: mapUser(s.toOriginalUserId),
            amount: s.amount,
            status: s.status,
            createdAt: parseDate(s.createdAt),
          },
        });
      }

      for (const c of input.payload.checklist) {
        await tx.checklistItem.create({
          data: {
            spaceId: space.id,
            title: c.title,
            isCompleted: c.isCompleted,
            createdAt: parseDate(c.createdAt),
          },
        });
      }

      if (input.payload.spaceNote?.body) {
        await tx.spaceNote.create({
          data: {
            spaceId: space.id,
            body: input.payload.spaceNote.body,
            updatedAt: parseDate(input.payload.spaceNote.updatedAt),
          },
        });
      }

      for (const d of input.payload.debts) {
        await tx.debt.create({
          data: {
            spaceId: space.id,
            type: d.type,
            counterparty: d.counterparty,
            initialAmount: d.initialAmount,
            dueDate: d.dueDate ? parseDate(d.dueDate) : null,
            status: d.status,
            createdById: mapUser(d.createdByOriginalUserId),
            createdAt: parseDate(d.createdAt),
            payments: {
              create: d.payments.map((p) => ({
                amount: p.amount,
                date: parseDate(p.date),
                note: p.note,
                createdById: mapUser(p.createdByOriginalUserId),
              })),
            },
          },
        });
      }

      for (const b of input.payload.categoryBudgets) {
        await tx.categoryBudget.create({
          data: {
            spaceId: space.id,
            category: b.category as ExpenseCategory,
            amount: b.amount,
          },
        });
      }

      for (const r of input.payload.recurringRules) {
        const rule = await tx.recurringRule.create({
          data: {
            spaceId: space.id,
            title: r.title,
            amount: r.amount,
            transactionType: r.transactionType as TransactionType,
            category: r.category as ExpenseCategory,
            dayOfMonth: r.dayOfMonth,
            active: r.active,
            createdById: mapUser(r.createdByOriginalUserId),
          },
          select: { id: true },
        });
        for (const o of r.occurrences) {
          const expenseId = expenseMap.get(o.originalExpenseId);
          if (!expenseId) continue;
          await tx.recurringOccurrence.create({
            data: {
              ruleId: rule.id,
              monthKey: o.monthKey,
              expenseId,
            },
          });
        }
      }

      for (const u of input.payload.units) {
        const created = await tx.unit.create({
          data: {
            spaceId: space.id,
            name: u.name,
            area: u.area,
            phone: u.phone?.trim() || null,
            multiplier: u.multiplier,
            isActive: u.isActive,
            // Invite tokens regenerated; residents re-claim after restore.
            linkedUserId: null,
            linkedAt: null,
          },
          select: { id: true },
        });
        unitMap.set(u.originalId, created.id);
      }

      for (const p of input.payload.chargePlans) {
        await tx.chargePlan.create({
          data: {
            spaceId: space.id,
            year: p.year,
            baseCharge: p.baseCharge,
          },
        });
      }

      let proofWarned = false;
      for (const p of input.payload.chargePayments) {
        const unitId = unitMap.get(p.originalUnitId);
        if (!unitId) continue;
        await tx.chargePayment.create({
          data: {
            unitId,
            year: p.year,
            month: p.month,
            amount: p.amount,
            status: p.status as ChargeStatus,
            date: parseDate(p.date),
            note: p.note,
            createdById: mapUser(p.createdByOriginalUserId),
          },
        });
        if (p.proofs.length > 0 && !proofWarned) {
          warnings.push(
            "فایل رسیدهای شارژ در بک‌آپ نبود و بازیابی نشد (فقط متادیتا).",
          );
          proofWarned = true;
        }
      }

      for (const s of input.payload.buildingSuggestions) {
        const unitId = unitMap.get(s.originalUnitId);
        if (!unitId) continue;
        await tx.buildingSuggestion.create({
          data: {
            spaceId: space.id,
            unitId,
            authorId: mapUser(s.authorOriginalUserId),
            title: s.title,
            body: s.body,
            status: s.status,
            managerNote: s.managerNote,
            createdAt: parseDate(s.createdAt),
          },
        });
      }

      for (const a of input.payload.buildingAnnouncements) {
        await tx.buildingAnnouncement.create({
          data: {
            spaceId: space.id,
            authorId: mapUser(a.authorOriginalUserId),
            title: a.title,
            body: a.body,
            pinned: a.pinned,
            archivedAt: a.archivedAt ? parseDate(a.archivedAt) : null,
            createdAt: parseDate(a.createdAt),
          },
        });
      }

      for (const c of input.payload.buildingContacts ?? []) {
        await tx.buildingContact.create({
          data: {
            spaceId: space.id,
            title: c.title,
            phone: c.phone,
            category: c.category as
              | "EMERGENCY"
              | "FACILITIES"
              | "CONTRACTOR"
              | "ADMIN"
              | "OTHER",
            note: c.note,
            sortOrder: c.sortOrder,
            pinned: c.pinned,
            visibleToResidents: c.visibleToResidents,
          },
        });
      }

      for (const pot of input.payload.savingsPots) {
        const created = await tx.savingsPot.create({
          data: {
            spaceId: space.id,
            title: pot.title,
            targetAmount: pot.targetAmount,
            deadline: pot.deadline ? parseDate(pot.deadline) : null,
            status: pot.status,
          },
          select: { id: true },
        });
        for (const t of pot.transactions) {
          const memberId = mapMember(t.originalMemberId);
          if (!memberId) continue;
          await tx.savingsTransaction.create({
            data: {
              potId: created.id,
              memberId,
              amount: t.amount,
              type: t.type,
              note: t.note,
              date: parseDate(t.date),
            },
          });
        }
      }

      for (const loan of input.payload.internalLoans) {
        const fromMemberId = mapMember(loan.fromOriginalMemberId);
        const toMemberId = mapMember(loan.toOriginalMemberId);
        if (!fromMemberId || !toMemberId) continue;
        await tx.internalLoan.create({
          data: {
            spaceId: space.id,
            fromMemberId,
            toMemberId,
            initialAmount: loan.initialAmount,
            dueDate: loan.dueDate ? parseDate(loan.dueDate) : null,
            status: loan.status,
            note: loan.note,
            payments: {
              create: loan.payments.map((p) => ({
                amount: p.amount,
                date: parseDate(p.date),
                note: p.note,
              })),
            },
          },
        });
      }

      if (input.payload.fundPlan) {
        await tx.fundPlan.create({
          data: {
            spaceId: space.id,
            shareAmount: input.payload.fundPlan.shareAmount,
            periodCount: input.payload.fundPlan.periodCount,
          },
        });
      }

      for (const t of input.payload.fundTurns) {
        const winnerMemberId = t.winnerOriginalMemberId
          ? mapMember(t.winnerOriginalMemberId)
          : null;
        await tx.fundTurn.create({
          data: {
            spaceId: space.id,
            periodIndex: t.periodIndex,
            winnerMemberId,
            status: winnerMemberId ? "ASSIGNED" : "OPEN",
            note: t.note,
          },
        });
      }

      for (const p of input.payload.fundPayments) {
        const memberId = mapMember(p.originalMemberId);
        if (!memberId) continue;
        await tx.fundPayment.create({
          data: {
            spaceId: space.id,
            periodIndex: p.periodIndex,
            memberId,
            amount: p.amount,
            date: parseDate(p.date),
            note: p.note,
            createdById: mapUser(p.createdByOriginalUserId),
          },
        });
      }

      return space.id;
    },
    { timeout: 60_000 },
  );

  return {
    spaceId,
    name: restoredName,
    type: spaceType,
    warnings: [...new Set(warnings)],
  };
}
