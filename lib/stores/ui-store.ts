import { create } from "zustand";

type UiState = {
  activeSpaceId: string | null;
  expenseFormOpen: boolean;
  setActiveSpaceId: (id: string | null) => void;
  setExpenseFormOpen: (open: boolean) => void;
};

/**
 * Client-only UI state. Ledger data must come from the server / Prisma.
 */
export const useUiStore = create<UiState>((set) => ({
  activeSpaceId: null,
  expenseFormOpen: false,
  setActiveSpaceId: (id) => set({ activeSpaceId: id }),
  setExpenseFormOpen: (open) => set({ expenseFormOpen: open }),
}));
