import type { Address } from "viem";

export const ACME_TOKEN_ADDRESS: Address = import.meta.env
  .VITE_ACME_TOKEN_ADDRESS as `0x${string}`;
export const GLOBEX_TOKEN_ADDRESS: Address = import.meta.env
  .VITE_GLOBEX_TOKEN_ADDRESS as `0x${string}`;
export const PEPE_TOKEN_ADDRESS: Address = import.meta.env
  .VITE_PEPE_TOKEN_ADDRESS as `0x${string}`;

export const FACTORY_ADDRESS: Address = import.meta.env
  .VITE_FACTORY_ADDRESS as `0x${string}`;
