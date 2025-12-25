import type { MockToken } from "@/lib/mockData"
import { Button } from "../ui/button"
import { useCallback, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { erc7984MintableTokenAbi } from "@/lib/abis/erc7984MintableTokenAbi";
import { useFhevm } from "@/hooks/useFhevm";
import { bytesToHex } from "viem";
import { chainPublicClient } from "@/lib/chainPublicActions";
import { useQueryClient } from "@tanstack/react-query";

type States = "idle" | "encrypting" | "confirm" | "pending";

const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    // rAF yields to next paint; setTimeout(0) also works
    requestAnimationFrame(() => resolve());
  });


export const TokenFaucet = (
  { token }: { token: MockToken }
) => {

  const [state, setState] = useState<States>("idle");

  const { address } = useAccount();

  const { data: instance } = useFhevm();

  const { writeContractAsync } = useWriteContract();

  const queryClient = useQueryClient();

  const handleFaucet = useCallback(async () => {

    if (!instance || !address) {
      console.error("FHEVM instance not ready");
      return;
    }

    setState("encrypting");

    await yieldToBrowser();
    await yieldToBrowser();
    await yieldToBrowser();

    const buffer = instance.createEncryptedInput(
      token.address,
      address
    );

    buffer.add64(1000n * (10n ** 6n));

    const ciphertexts = await buffer.encrypt();

    console.log("Minting to faucet:", token.address, address, ciphertexts);

    setState("confirm");

    const tx = await writeContractAsync({
      address: token.address as `0x${string}`,
      abi: erc7984MintableTokenAbi,
      functionName: "mint",
      args: [address, bytesToHex(ciphertexts.handles[0]), bytesToHex(ciphertexts.inputProof)]
    });

    setState("pending");

    const publicClient = chainPublicClient();

    await publicClient.waitForTransactionReceipt({
      hash: tx,
    });

    setState("idle");

    queryClient.invalidateQueries({ queryKey: ["tokenBalances", address] });
  }, [instance, address, token.address, writeContractAsync, queryClient]);

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleFaucet}
    >

      {
        state === "idle" ? "Faucet" :
          state === "encrypting" ? "Encrypting..." :
            state === "confirm" ? "Confirm..." :
              state === "pending" ? "Pending..." :
                "Faucet"
      }
    </Button >
  )
}