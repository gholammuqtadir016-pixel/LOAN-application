import { create } from "zustand";
import { EMPTY_LOAN, type LoanData } from "@/types/loan";
type State = {
  id: string | null;
  step: number;
  data: LoanData;
  setId: (id: string | null) => void;
  setStep: (n: number) => void;
  patch: (data: Partial<LoanData>) => void;
  hydrate: (id: string, data: LoanData) => void;
  reset: () => void;
};
export const useLoanStore = create<State>((set) => ({
  id: null,
  step: 0,
  data: { ...EMPTY_LOAN },
  setId: (id) => set({ id }),
  setStep: (step) => set({ step }),
  patch: (patch) => set((s) => ({ data: { ...s.data, ...patch } })),
  hydrate: (id, data) => set({ id, data }),
  reset: () => set({ id: null, step: 0, data: { ...EMPTY_LOAN } }),
}));
