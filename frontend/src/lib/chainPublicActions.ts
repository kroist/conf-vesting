import { createPublicClient, erc20Abi, http } from "viem";
import { sepolia } from "viem/chains";

export const chainPublicClient = () => {
  return createPublicClient({
    chain: sepolia,
    transport: http(),
  });
};

export const erc20Allowance = async (
  tokenAddress: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`
) => {
  const publicClient = chainPublicClient();
  const allowance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, spender],
  });
  return allowance;
};
