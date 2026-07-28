import { create } from "zustand";
import type { TransactionTypeForm } from "@/lib/validations/expense";

type ToastTone = "success" | "error";

type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
} | null;

type UiState = {
  activeSpaceId: string | null;
  expenseFormOpen: boolean;
  /** Prefill for expense form when opened from empty-state chips (خانه / …). */
  draftTransactionType: TransactionTypeForm;
  toast: ToastState;
  setActiveSpaceId: (id: string | null) => void;
  setExpenseFormOpen: (open: boolean) => void;
  openExpenseForm: (opts?: { transactionType?: TransactionTypeForm }) => void;
  showToast: (message: string, tone?: ToastTone) => void;
  clearToast: () => void;
};

/**
 * Client-only UI state. Ledger data must come from the server / Prisma.
 */
export const useUiStore = create<UiState>((set) => ({
  activeSpaceId: null,
  expenseFormOpen: false,
  draftTransactionType: "EXPENSE",
  toast: null,
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
  showToast: (message, tone = "success") =>
    set({ toast: { id: Date.now(), message, tone } }),
  clearToast: () => set({ toast: null }),
}));
