import { useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useAccount, useWriteContract } from "wagmi";
import { bytesToHex } from "viem";
import { confVestingAbi } from "@/lib/abis/confVestingAbi";
import { erc7984MintableTokenAbi } from "@/lib/abis/erc7984MintableTokenAbi";
import { useFhevm } from "@/hooks/useFhevm";
import { useQueryClient } from "@tanstack/react-query";
import { chainPublicClient } from "@/lib/chainPublicActions";
import { TokenBalance } from "../tokens/TokenBalance";

interface DepositTokensProps {
  vestingWalletAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
}

type SubmissionState =
  | { state: "idle" }
  | { state: "confirm" }
  | { state: "pending" }
  | { state: "encrypting" }
  | { state: "success"; tx: string };

const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

export function DepositTokens({
  vestingWalletAddress,
  tokenAddress,
  tokenSymbol,
}: DepositTokensProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    state: "idle",
  });

  const { address } = useAccount();
  const { data: instance } = useFhevm();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  const handleDeposit = async () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    if (!address) {
      console.error("missing address");
      return;
    }
    if (!instance) {
      console.error("missing fhevm");
      return;
    }

    try {
      const publicClient = chainPublicClient();

      // Step 1: Set operator
      setSubmissionState({ state: "confirm" });

      const tx1 = await writeContractAsync({
        address: tokenAddress,
        abi: erc7984MintableTokenAbi,
        functionName: "setOperator",
        args: [
          vestingWalletAddress,
          Math.round(Date.now() / 1000) + 10 * 60,
        ],
      });

      setSubmissionState({ state: "pending" });

      await publicClient.waitForTransactionReceipt({ hash: tx1 });

      // Step 2: Encrypt amount
      setSubmissionState({ state: "encrypting" });

      await yieldToBrowser();
      await yieldToBrowser();
      await yieldToBrowser();

      const buffer = instance.createEncryptedInput(
        vestingWalletAddress,
        address
      );

      buffer.add64(BigInt(Math.round(parseFloat(amount))) * 10n ** 6n);

      const ciphertexts = await buffer.encrypt();

      // Step 3: Deposit tokens
      setSubmissionState({ state: "confirm" });

      const tx2 = await writeContractAsync({
        address: vestingWalletAddress,
        abi: confVestingAbi,
        functionName: "depositTokens",
        args: [
          bytesToHex(ciphertexts.handles[0]),
          bytesToHex(ciphertexts.inputProof),
        ],
      });

      setSubmissionState({ state: "pending" });
      await publicClient.waitForTransactionReceipt({ hash: tx2 });

      setSubmissionState({ state: "success", tx: tx2 });

      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: ["tokenBalances"],
      });

      queryClient.invalidateQueries({
        queryKey: ["vestingsList"],
      });

      // Reset form after short delay
      setTimeout(() => {
        setAmount("");
        setSubmissionState({ state: "idle" });
        setOpen(false);
      }, 2000);
    } catch (error) {
      console.error("Deposit failed:", error);
      setSubmissionState({ state: "idle" });
    }
  };

  const isSubmitting =
    submissionState.state === "confirm" ||
    submissionState.state === "pending" ||
    submissionState.state === "encrypting";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          Deposit More Tokens
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Deposit {tokenSymbol} Tokens</DialogTitle>
          <DialogDescription>
            Add more tokens to this vesting wallet. The amount will be encrypted
            client-side before sending to the blockchain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Privacy Notice */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm font-medium">🔒 Privacy Note</p>
            <p className="text-xs text-muted-foreground mt-1">
              The amount you enter will be encrypted client-side before being
              sent to the blockchain. The contract never receives plaintext
              amounts.
            </p>
          </div>

          {/* Status Messages */}
          {submissionState.state === "encrypting" && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                ⏳ Encrypting amount...
              </p>
            </div>
          )}
          {submissionState.state === "confirm" && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                ⏳ Confirm in wallet...
              </p>
            </div>
          )}
          {submissionState.state === "pending" && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-900">
                ⏳ Waiting for transaction...
              </p>
            </div>
          )}
          {submissionState.state === "success" && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900">
                ✓ Deposit successful!
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

          {/* Amount Input */}
          {submissionState.state !== "success" && (
            <div className="space-y-2">
              <Label htmlFor="deposit-amount">Token Amount</Label>
              <Input
                id="deposit-amount"
                type="number"
                placeholder="10000"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (
                    value === "" ||
                    (Number(value) >= 0 && Number.isInteger(Number(value)))
                  ) {
                    setAmount(value);
                  }
                }}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Enter the amount of {tokenSymbol} tokens to deposit
              </p>
              <div className="flex gap-1 items-center">
                <p className="text-xs text-muted-foreground">
                  Available:
                </p>
                <TokenBalance tokenAddress={tokenAddress} />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {submissionState.state !== "success" && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeposit}
                disabled={isSubmitting || !amount}
                className="flex-1"
              >
                {isSubmitting ? "Processing..." : "Deposit Tokens"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
