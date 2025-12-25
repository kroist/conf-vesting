import { chainPublicClient } from "@/lib/chainPublicActions";
import { confVestingAbi } from "@/lib/abis/confVestingAbi";
import { useQuery } from "@tanstack/react-query";
import { mockTokens, type MockVesting } from "@/lib/mockData";
import { useAccount } from "wagmi";
import { useEmployeeVestingsAddress } from "./useEmployeeVestingsAddress";

export const useEmployeeVestings = () => {
  const { data: vestingAddresses } = useEmployeeVestingsAddress();
  const { address } = useAccount();

  const vestingsParam = vestingAddresses
    ? vestingAddresses.length.toString()
    : "0";

  return useQuery<MockVesting[]>({
    queryKey: ["employeeVestings", vestingsParam],
    queryFn: async () => {
      const publicClient = chainPublicClient();
      console.log("Starting fetch");
      if (!vestingAddresses) {
        throw new Error("no vesting addresses");
      }

      const tokenCalls = vestingAddresses.map((vestingAddress) => ({
        address: vestingAddress,
        abi: confVestingAbi,
        functionName: "token",
      }));

      const ownerCalls = vestingAddresses.map((vestingAddress) => ({
        address: vestingAddress,
        abi: confVestingAbi,
        functionName: "owner",
      }));

      const beneficiaryCalls = vestingAddresses.map((vestingAddress) => ({
        address: vestingAddress,
        abi: confVestingAbi,
        functionName: "beneficiary",
      }));

      const startCalls = vestingAddresses.map((vestingAddress) => ({
        address: vestingAddress,
        abi: confVestingAbi,
        functionName: "start",
      }));

      const durationCalls = vestingAddresses.map((vestingAddress) => ({
        address: vestingAddress,
        abi: confVestingAbi,
        functionName: "duration",
      }));

      const results = await publicClient.multicall({
        contracts: [
          ...tokenCalls,
          ...ownerCalls,
          ...beneficiaryCalls,
          ...startCalls,
          ...durationCalls,
        ],
      });

      // Parse multicall results - they're grouped by call type
      const count = vestingAddresses.length;
      const tokens = results.slice(0, count);
      const owners = results.slice(count, count * 2);
      const beneficiaries = results.slice(count * 2, count * 3);
      const starts = results.slice(count * 3, count * 4);
      const durations = results.slice(count * 4, count * 5);

      // Transform into MockVesting array
      const vestings: MockVesting[] = vestingAddresses.map(
        (vestingAddress, i) => {
          const tokenAddress = tokens[i].result as `0x${string}`;
          const owner = owners[i].result as `0x${string}`;
          const beneficiary = beneficiaries[i].result as `0x${string}`;
          const start = Number(starts[i].result);
          const duration = Number(durations[i].result);

          // Look up token symbol from mockTokens
          const tokenInfo = mockTokens.find(
            (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
          );
          const tokenSymbol = tokenInfo?.symbol ?? "UNKNOWN";

          return {
            id: vestingAddress,
            tokenAddress,
            tokenSymbol,
            beneficiary,
            owner,
            startTimestamp: start * 1000, // Convert to milliseconds
            endTimestamp: (start + duration) * 1000, // Convert to milliseconds
            totalAllocation: "0x",
            released: "0x",
          };
        }
      );

      const totalAllocationCalls = vestings.map((vesting) => ({
        address: vesting.id as `0x${string}`,
        abi: confVestingAbi,
        functionName: "totalAllocation",
        args: [vesting.tokenAddress],
        from: address,
      }));

      const releasedCalls = vestings.map((vesting) => ({
        address: vesting.id as `0x${string}`,
        abi: confVestingAbi,
        functionName: "released",
        args: [vesting.tokenAddress],
        from: address,
      }));

      const results2 = await publicClient.multicall({
        contracts: [...totalAllocationCalls, ...releasedCalls],
      });
      console.log(results2);
      const totalAllocations = results2.slice(0, count);
      const releaseds = results2.slice(count, count * 2);

      const vestings2: MockVesting[] = vestings.map((vesting, i) => {
        const totalAllocation = totalAllocations[i].result as `0x${string}`;
        const released = releaseds[i].result as `0x${string}`;

        return {
          ...vesting,
          totalAllocation,
          released,
        };
      });

      return vestings2;
    },
    enabled: !!vestingAddresses,
  });
};
