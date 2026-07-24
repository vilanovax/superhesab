import { create } from "zustand";
import type { TransactionTypeForm } from "@/lib/validations/expense";

type UiState = {
  activeSpaceId: string | null;
  expenseFormOpen: boolean;
  /** Prefill for PERSONAL create form when opened from empty-state chips. */
  draftTransactionType: TransactionTypeForm;
  setActiveSpaceId: (id: string | null) => void;
  setExpenseFormOpen: (open: boolean) => void;
  openExpenseForm: (opts?: { transactionType?: TransactionTypeForm }) => void;
};

/**
 * Client-only UI state. Ledger data must come from the server / Prisma.
 */
export const useUiStore = create<UiState>((set) => ({
  activeSpaceId: null,
  expenseFormOpen: false,
  draftTransactionType: "EXPENSE",
  setActiveSpaceId: (id) => set({ activeSpaceId: id }),
  setExpenseFormOpen: (open) =>
    set(
      open
        ? { expenseFormOpen: true }
        : { expenseFormOpen: false, draftTransactionType: "EXPENSE" },
    ),
  openExpenseForm: (opts) =>
    set({
      expenseFormOpen: true,
      draftTransactionType: opts?.transactionType ?? "EXPENSE",
    }),
}));
