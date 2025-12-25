import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BalanceMap {
  [address: `0x${string}`]: string;
}

interface DecryptionState {
  balances: BalanceMap;

  getBalance: (address: `0x${string}`) => bigint | undefined;
  setBalance: (address: `0x${string}`, amount: bigint) => void;
}

export const useDecryptionStore = create<DecryptionState>()(
  persist(
    (set, get) => ({
      balances: {
        "0x0000000000000000000000000000000000000000000000000000000000000000":
          "0",
      },

      getBalance: (ciphertext) => {
        const maybeText = get().balances[ciphertext];
        if (maybeText) {
          return BigInt(maybeText);
        }
        return undefined;
      },
      setBalance: (ciphertext, amount) =>
        set((state) => {
          const amountStr = amount.toString();
          return {
            balances: {
              ...state.balances,
              [ciphertext]: amountStr,
            },
          };
        }),
    }),
    {
      name: "decrypted-balances-storage",
    }
  )
);
