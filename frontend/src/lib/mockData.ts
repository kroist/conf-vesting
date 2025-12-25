// Mock data for UI skeleton

import {
  ACME_TOKEN_ADDRESS,
  GLOBEX_TOKEN_ADDRESS,
  PEPE_TOKEN_ADDRESS,
} from "./consts";

export interface MockToken {
  address: string;
  symbol: string;
  name: string;
  balance: string;
}

export interface MockVesting {
  id: string;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  beneficiary: string;
  owner: string;
  startTimestamp: number;
  endTimestamp: number;
  totalAllocation: `0x${string}`;
  released: `0x${string}`;
}

export const mockTokens: MockToken[] = [
  {
    address: ACME_TOKEN_ADDRESS,
    symbol: "ACME",
    name: "ACME Token",
    balance: "10,000",
  },
  {
    address: GLOBEX_TOKEN_ADDRESS,
    symbol: "GLOBEX",
    name: "Globex Token",
    balance: "🔒 Encrypted",
  },
  {
    address: PEPE_TOKEN_ADDRESS,
    symbol: "PEPE",
    name: "Pepe Token",
    balance: "5,500",
  },
];
