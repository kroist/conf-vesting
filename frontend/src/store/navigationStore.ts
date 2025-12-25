import { create } from "zustand";

export type ViewState =
  | "home"
  | "employer-dashboard"
  | "employee-dashboard"
  | "create-vesting"
  | "vesting-detail";

export type RoleState = "employer" | "employee";

interface NavigationState {
  currentView: ViewState;
  role: RoleState;
  selectedVestingId: string | null;
  selectedTokenAddress: string | null;

  // Actions
  navigateTo: (view: ViewState) => void;
  setRole: (role: RoleState) => void;
  selectVesting: (id: string) => void;
  selectToken: (address: string) => void;
  goBack: () => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentView: "employer-dashboard",
  role: "employer",
  selectedVestingId: null,
  selectedTokenAddress: null,

  navigateTo: (view) => set({ currentView: view }),

  setRole: (role) => set({ role }),

  selectVesting: (id) =>
    set({
      selectedVestingId: id,
      currentView: "vesting-detail",
    }),

  selectToken: (address) => set({ selectedTokenAddress: address }),

  goBack: () => {
    const { role } = get();
    const dashboard =
      role === "employer" ? "employer-dashboard" : "employee-dashboard";
    set({ currentView: dashboard });
  },
}));
