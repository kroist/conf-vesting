import { mockTokens } from "@/lib/mockData";
import { EncryptedValue } from "../privacy/EncryptedValue";
import { useEncryptedTokenBalances } from "@/hooks/useEncryptedTokenBalances";

export const TokenBalance = (
  {
    tokenAddress,
  }: {
    tokenAddress: `0x${string}`;
  }
) => {

  const { data: encryptedTokenBalances } = useEncryptedTokenBalances();
  const ciphertext = encryptedTokenBalances?.[mockTokens.findIndex(t => t.address === tokenAddress)] ?? "0x0000000000000000000000000000000000000000000000000000000000000000"

  return EncryptedValue({
    ciphertext,
    contractAddress: tokenAddress as `0x${string}`
  })
}
