import { useState } from "react";
import { mockTokens } from "../../lib/mockData";
import { useNavigationStore } from "../../store/navigationStore";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useEncryptedTokenBalances } from "@/hooks/useEncryptedTokenBalances";
import { TokenBalance } from "../tokens/TokenBalance";
import { useAccount, useWriteContract } from "wagmi";
import { FACTORY_ADDRESS } from "@/lib/consts";
import { confVestingAbiFactoryAbi } from "@/lib/abis/confVestingAbiFactoryAbi";
import { chainPublicClient } from "@/lib/chainPublicActions";
import { bytesToHex, parseEventLogs } from "viem";
import { confVestingAbi } from "@/lib/abis/confVestingAbi";
import { erc7984MintableTokenAbi } from "@/lib/abis/erc7984MintableTokenAbi";
import { useFhevm } from "@/hooks/useFhevm";
import { useQueryClient } from "@tanstack/react-query";

type Step = 0 | 1 | 2;

interface CreateVestingParams {
  tokenAddress: string;
  beneficiary: string;
  startTimestamp: number;
  durationSeconds: number;
  initialAmount?: number;
}

type SubmissionState =
  | { state: "idle" }
  | { state: "confirm" }
  | { state: "pending" }
  | { state: "encrypting" }
  | { state: "success"; tx: string };


const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    // rAF yields to next paint; setTimeout(0) also works
    requestAnimationFrame(() => resolve());
  });


export function CreateVesting() {
  const { goBack } = useNavigationStore();
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [selectedToken, setSelectedToken] = useState<string>("");

  // Form state
  const [beneficiary, setBeneficiary] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  // Submission state
  const [submissionState, setSubmissionState] = useState<SubmissionState>({ state: "idle" });

  const { data: encryptedTokenBalances } = useEncryptedTokenBalances();
  const { writeContractAsync } = useWriteContract();

  const { data: instance } = useFhevm();
  const { address } = useAccount();

  const queryClient = useQueryClient();


  // Handler function that accepts all parameters
  const handleCreateVesting = async (params: CreateVestingParams) => {

    // Validation
    if (!params.tokenAddress || !params.beneficiary || !params.startTimestamp || !params.durationSeconds) {
      console.error("Missing required parameters");
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
    console.log("Creating vesting with params:", params);


    // Set state to confirm (waiting for wallet confirmation)
    setSubmissionState({ state: "confirm" });

    try {
      const tx = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: confVestingAbiFactoryAbi,
        functionName: "createVestingWallet",
        args: [params.tokenAddress as `0x${string}`, params.beneficiary as `0x${string}`, BigInt(params.startTimestamp), BigInt(params.durationSeconds)]
      })

      setSubmissionState({ state: "pending" });

      const publicClient = chainPublicClient();

      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      queryClient.invalidateQueries({
        queryKey: ["vestingsList"]
      })

      if (params.initialAmount) {

        //Deposit

        const logs = parseEventLogs({
          abi: confVestingAbiFactoryAbi,
          logs: receipt.logs,
          eventName: "VestingWalletCreated"
        });
        if (logs.length === 0) {
          throw new Error("logs not found");
        }
        const vestingWalletAddress = logs[0].args.vestingWallet;


        setSubmissionState({ state: "confirm" });

        const tx = await writeContractAsync({
          address: params.tokenAddress as `0x${string}`,
          abi: erc7984MintableTokenAbi,
          functionName: "setOperator",
          args: [vestingWalletAddress, Math.round(Date.now() / 1000) + 10 * 60]
        })


        setSubmissionState({ state: "pending" });

        await publicClient.waitForTransactionReceipt({ hash: tx });

        setSubmissionState({ state: "encrypting" });

        await yieldToBrowser();
        await yieldToBrowser();
        await yieldToBrowser();

        const buffer = instance.createEncryptedInput(
          vestingWalletAddress,
          address
        );

        buffer.add64(BigInt(Math.round(params.initialAmount)) * 10n ** 6n);

        const ciphertexts = await buffer.encrypt();

        const tx2 = await writeContractAsync({
          address: vestingWalletAddress,
          abi: confVestingAbi,
          functionName: "depositTokens",
          args: [bytesToHex(ciphertexts.handles[0]), bytesToHex(ciphertexts.inputProof)]
        });

        setSubmissionState({ state: "pending" })
        await publicClient.waitForTransactionReceipt({ hash: tx2 })

        setSubmissionState({ state: "success", tx: tx2 })

        queryClient.invalidateQueries({
          queryKey: ["tokenBalances"]
        })

        queryClient.invalidateQueries({
          queryKey: ["vestingsList"]
        })

      }

      setSubmissionState({ state: "success", tx });
    } catch {
      setSubmissionState({ state: "idle" })
    }
  };

  // Helper to convert form data to params
  const prepareParams = (withDeposit: boolean): CreateVestingParams | null => {
    // Validate beneficiary address
    if (!beneficiary || !beneficiary.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert("Please enter a valid beneficiary address");
      return null;
    }

    // Validate start date
    if (!startDate) {
      alert("Please enter a start date");
      return null;
    }
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);

    // Calculate duration
    let durationSeconds: number;
    if (duration && !endDate) {
      // Use duration in days
      const durationDays = parseFloat(duration);
      if (isNaN(durationDays) || durationDays <= 0) {
        alert("Please enter a valid duration in days");
        return null;
      }
      durationSeconds = durationDays * 24 * 60 * 60;
    } else if (endDate && !duration) {
      // Use end date
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
      if (endTimestamp <= startTimestamp) {
        alert("End date must be after start date");
        return null;
      }
      durationSeconds = endTimestamp - startTimestamp;
    } else if (duration && endDate) {
      alert("Please specify either duration OR end date, not both");
      return null;
    } else {
      alert("Please specify either duration or end date");
      return null;
    }

    const params: CreateVestingParams = {
      tokenAddress: selectedToken,
      beneficiary,
      startTimestamp,
      durationSeconds,
    };

    // Add initial amount if depositing
    if (withDeposit) {
      if (!amount || parseFloat(amount) <= 0) {
        alert("Please enter a valid amount");
        return null;
      }
      params.initialAmount = parseFloat(amount);
    }

    return params;
  };

  const handleSkipDeposit = () => {
    const params = prepareParams(false);
    if (params) {
      handleCreateVesting(params);
    }
  };

  const handleCreateWithDeposit = () => {
    const params = prepareParams(true);
    if (params) {
      handleCreateVesting(params);
    }
  };

  const steps = [
    "Select Token",
    "Vesting Schedule",
    "Initial Allocation"
  ];

  if (!encryptedTokenBalances) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <p>Loading...</p>
      </div>
    );
  }

  // Success screen
  if (submissionState.state === "success") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">✓ Vesting Created Successfully</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium">Transaction Hash</p>
              <a
                href={`https://sepolia.etherscan.io/tx/${submissionState.tx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-blue-600 hover:underline break-all"
              >
                {submissionState.tx}
              </a>
            </div>
            <Button onClick={goBack} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSubmitting = submissionState.state === "confirm" || submissionState.state === "pending" || submissionState.state === "encrypting";

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Back Button */}
      <Button variant="outline" onClick={goBack} className="mb-6" disabled={isSubmitting}>
        ← Back
      </Button>

      {/* Submission Status */}
      {submissionState.state === "encrypting" && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-blue-900">⏳ Encrypting...</p>
          </CardContent>
        </Card>
      )}
      {submissionState.state === "confirm" && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-blue-900">⏳ Confirm in wallet...</p>
          </CardContent>
        </Card>
      )}
      {submissionState.state === "pending" && (
        <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-yellow-900">⏳ Waiting for transaction...</p>
          </CardContent>
        </Card>
      )}

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
            >
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${index <= currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                    }`}
                >
                  {index + 1}
                </div>
                <p className="text-xs mt-1 text-center">{step}</p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 ${index < currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 0: Token Selection */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Token</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose which confidential token to use for this vesting
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <Select value={selectedToken} onValueChange={setSelectedToken}>
                <SelectTrigger id="token">
                  <SelectValue placeholder="Select a token" />
                </SelectTrigger>
                <SelectContent>
                  {mockTokens.map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      <div className="flex items-center justify-between w-full">
                        <span>{token.symbol} - {token.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


            {selectedToken && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Selected Token</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {selectedToken}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Balance: </p>
                  <TokenBalance
                    tokenAddress={mockTokens.find(t => t.address === selectedToken)!.address as `0x${string}`}
                  />
                </div>
              </div>

            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setCurrentStep(1)}
                disabled={!selectedToken}
              >
                Next →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Vesting Schedule */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Define Vesting Schedule</CardTitle>
            <p className="text-sm text-muted-foreground">
              Set the beneficiary and time parameters
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="beneficiary">Beneficiary Address</Label>
              <Input
                id="beneficiary"
                placeholder="0x..."
                className="font-mono"
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="365"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={isSubmitting || !!endDate}
              />
              <p className="text-xs text-muted-foreground">
                Or you can specify an end date instead
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (alternative)</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isSubmitting || !!duration}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                ← Back
              </Button>
              <Button onClick={() => setCurrentStep(2)}>
                Next →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Initial Allocation */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Initial Allocation (Optional)</CardTitle>
            <p className="text-sm text-muted-foreground">
              You can deposit tokens now or skip and fund later
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium">🔒 Privacy Note</p>
              <p className="text-xs text-muted-foreground mt-1">
                The amount you enter will be encrypted client-side before being
                sent to the blockchain. The contract never receives plaintext amounts.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Token Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="10000"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || (Number(value) >= 0 && Number.isInteger(Number(value)))) {
                    setAmount(value);
                  }
                }}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to skip initial deposit
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                disabled={isSubmitting}
              >
                ← Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSkipDeposit}
                  disabled={isSubmitting}
                >
                  Skip Deposit
                </Button>
                <Button
                  onClick={handleCreateWithDeposit}
                  disabled={isSubmitting}
                >
                  Create & Deposit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
