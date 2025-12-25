import { confVestingAbiFactoryAbi } from "@/lib/abis/confVestingAbiFactoryAbi";
import { chainPublicClient } from "@/lib/chainPublicActions";
import { FACTORY_ADDRESS } from "@/lib/consts";
import { useQuery } from "@tanstack/react-query";
import { getContract } from "viem";
import { useAccount } from "wagmi";

export const useEmployeeVestingsAddress = () => {
  const { address } = useAccount();

  return useQuery({
    queryKey: ["employeeVestingsList", address],
    queryFn: async () => {
      const publicClient = chainPublicClient();

      const contract = getContract({
        address: FACTORY_ADDRESS,
        abi: confVestingAbiFactoryAbi,
        client: publicClient,
      });
      const wallets = await contract.read.getBeneficiaryWallets([address!]);

      return wallets;
    },
    enabled: !!address,
  });
};
