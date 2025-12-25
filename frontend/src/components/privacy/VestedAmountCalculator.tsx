import { useDecryptionStore } from "@/store/decryptionStore";
import { useAccount, useSignTypedData } from "wagmi";
import { useFhevm } from "@/hooks/useFhevm";
import { useCallback, useMemo, useState } from "react";
import { formatUnits, type TypedDataDomain } from "viem";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

interface VestedAmountCalculatorProps {
  totalAllocation: `0x${string}`;
  released: `0x${string}`;
  contractAddress: `0x${string}`;
  startTimestamp: number;
  endTimestamp: number;
}

export function VestedAmountCalculator({
  totalAllocation,
  released,
  contractAddress,
  startTimestamp,
  endTimestamp,
}: VestedAmountCalculatorProps) {
  const { getBalance, setBalance } = useDecryptionStore();
  const decryptedTotalAllocation = getBalance(totalAllocation);
  const decryptedReleased = getBalance(released);

  const { signTypedDataAsync } = useSignTypedData();
  const { address } = useAccount();
  const { data: instance } = useFhevm();
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Calculate vested amount client-side using linear vesting formula
  const { vestedAmount, claimableAmount } = useMemo(() => {
    if (decryptedTotalAllocation === undefined || decryptedReleased === undefined) {
      return { vestedAmount: undefined, claimableAmount: undefined };
    }

    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const start = Math.floor(startTimestamp / 1000); // Convert ms to seconds
    const end = Math.floor(endTimestamp / 1000); // Convert ms to seconds
    const duration = end - start;

    let vested: bigint;

    if (now < start) {
      // Vesting hasn't started yet
      vested = 0n;
    } else if (now >= end) {
      // Vesting is complete
      vested = decryptedTotalAllocation;
    } else {
      // Linear vesting: totalAllocation * (now - start) / duration
      const elapsed = BigInt(now - start);
      const durationBig = BigInt(duration);
      vested = (decryptedTotalAllocation * elapsed) / durationBig;
    }

    // Claimable = vested - released
    const claimable = vested > decryptedReleased ? vested - decryptedReleased : 0n;

    return { vestedAmount: vested, claimableAmount: claimable };
  }, [decryptedTotalAllocation, decryptedReleased, startTimestamp, endTimestamp]);

  const handleDecrypt = useCallback(async () => {
    try {
      if (!instance || !address) {
        console.error("FHEVM instance not ready");
        return;
      }
      setIsDecrypting(true);

      const keypair = instance.generateKeypair();

      // Only decrypt values that aren't already in the store
      const handleContractPairs: Array<{ handle: `0x${string}`; contractAddress: `0x${string}` }> = [];
      const contractAddresses: Array<`0x${string}`> = [];

      if (decryptedTotalAllocation === undefined) {
        handleContractPairs.push({
          handle: totalAllocation,
          contractAddress,
        });
        contractAddresses.push(contractAddress);
      }

      if (decryptedReleased === undefined) {
        handleContractPairs.push({
          handle: released,
          contractAddress,
        });
        contractAddresses.push(contractAddress);
      }

      // If nothing to decrypt, we shouldn't reach here, but just in case
      if (handleContractPairs.length === 0) {
        setIsDecrypting(false);
        return;
      }

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10'; // String for consistency

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays,
      );

      const signature = await signTypedDataAsync({
        domain: eip712.domain as TypedDataDomain,
        types: {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        primaryType: "UserDecryptRequestVerification",
        message: eip712.message,
      });

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      // Store only newly decrypted values
      if (decryptedTotalAllocation === undefined) {
        const decryptedTotal = result[totalAllocation];
        if (decryptedTotal) {
          setBalance(totalAllocation, decryptedTotal as bigint);
        } else {
          console.error("Decryption failed for totalAllocation");
        }
      }

      if (decryptedReleased === undefined) {
        const decryptedRel = result[released];
        if (decryptedRel) {
          setBalance(released, decryptedRel as bigint);
        } else {
          console.error("Decryption failed for released");
        }
      }

      setIsDecrypting(false);

    } catch (error) {
      console.error("Error during decryption:", error);
      setIsDecrypting(false);
    }
  }, [instance, address, totalAllocation, released, contractAddress, signTypedDataAsync, setBalance, decryptedTotalAllocation, decryptedReleased]);

  // If not decrypted, show decrypt button
  if (decryptedTotalAllocation === undefined || decryptedReleased === undefined) {
    return (
      <div className="space-y-4">
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Decrypt values to calculate vested amount
          </p>
          <Button
            onClick={handleDecrypt}
            disabled={isDecrypting}
            size="lg"
          >
            {isDecrypting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Decrypting...
              </>
            ) : (
              <>🔓 Decrypt & Calculate</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Show calculated values
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Currently Vested</p>
        <p className="text-2xl font-bold text-primary">
          {formatUnits(vestedAmount!, 6)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Calculated client-side using linear vesting formula
        </p>
      </div>
      <Separator />
      <div>
        <p className="text-sm text-muted-foreground">Claimable Now</p>
        <p className="text-2xl font-bold text-green-600">
          {formatUnits(claimableAmount!, 6)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Vested amount minus already claimed
        </p>
      </div>
    </div>
  );
}
