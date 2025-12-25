import { erc7984MintableTokenAbi } from "@/lib/abis/erc7984MintableTokenAbi";
import { chainPublicClient } from "@/lib/chainPublicActions";
import {
  ACME_TOKEN_ADDRESS,
  GLOBEX_TOKEN_ADDRESS,
  PEPE_TOKEN_ADDRESS,
} from "@/lib/consts";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

export const useEncryptedTokenBalances = () => {
  const { address } = useAccount();

  return useQuery({
    queryKey: ["tokenBalances", address],
    queryFn: async () => {
      const publicClient = chainPublicClient();

      const addresses = [
        ACME_TOKEN_ADDRESS,
        GLOBEX_TOKEN_ADDRESS,
        PEPE_TOKEN_ADDRESS,
      ];

      const balanceCalls = addresses.map((tokenAddress) => ({
        address: tokenAddress,
        abi: erc7984MintableTokenAbi,
        functionName: "confidentialBalanceOf",
        args: [address as `0x${string}`],
      }));

      const balancesResults = await publicClient.multicall({
        contracts: balanceCalls,
      });

      const balances = balancesResults.map(
        (result) => result.result as `0x${string}`
      );

      return balances;
    },
    enabled: !!address,
  });
};
