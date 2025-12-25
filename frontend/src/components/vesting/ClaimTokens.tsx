import { useState } from "react";
import { Button } from "../ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useWriteContract } from "wagmi";
import { confVestingAbi } from "@/lib/abis/confVestingAbi";
import { chainPublicClient } from "@/lib/chainPublicActions";

interface ClaimTokensProps {
  vestingWalletAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
}

type SubmissionState =
  | { state: "idle" }
  | { state: "confirm" }
  | { state: "pending" }
  | { state: "success"; tx: string };

export function ClaimTokens({
  vestingWalletAddress,
  tokenAddress,
  tokenSymbol,
}: ClaimTokensProps) {
  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    state: "idle",
  });

  const queryClient = useQueryClient();

  const { writeContractAsync } = useWriteContract();

  const handleClaim = async () => {
    try {
      setSubmissionState({ state: "confirm" });

      const tx = await writeContractAsync({
        address: vestingWalletAddress,
        abi: confVestingAbi,
        functionName: "release",
        args: [tokenAddress]
      });

      setSubmissionState({ state: "pending" });

      const publicClient = chainPublicClient();
      await publicClient.waitForTransactionReceipt({ hash: tx });
      setSubmissionState({ state: "success", tx: tx });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ["employeeVestings"],
      });

      queryClient.invalidateQueries({
        queryKey: ["tokenBalances"],
      });

      // Reset to idle after showing success message
      setTimeout(() => {
        setSubmissionState({ state: "idle" });
      }, 3000);
    } catch (error) {
      console.error("Claim failed:", error);
      setSubmissionState({ state: "idle" });
    }
  };

  const isSubmitting =
    submissionState.state === "confirm" || submissionState.state === "pending";

  const getButtonText = () => {
    switch (submissionState.state) {
      case "confirm":
        return "Confirm in Wallet...";
      case "pending":
        return "Processing...";
      case "success":
        return "✓ Claimed Successfully";
      default:
        return "Claim Vested Tokens";
    }
  };

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        size="lg"
        onClick={handleClaim}
        disabled={isSubmitting}
      >
        {getButtonText()}
      </Button>

      {/* Status Messages */}
      {submissionState.state === "confirm" && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900">
            ⏳ Please confirm the transaction in your wallet
          </p>
        </div>
      )}

      {submissionState.state === "pending" && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-900">
            ⏳ Waiting for transaction confirmation...
          </p>
        </div>
      )}

      {submissionState.state === "success" && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-900">
            ✓ {tokenSymbol} tokens claimed successfully!
          </p>
          <a
            href={`https://sepolia.etherscan.io/tx/${submissionState.tx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-blue-600 hover:underline break-all"
          >
            View transaction
          </a>
        </div>
      )}
    </div>
  );
}
