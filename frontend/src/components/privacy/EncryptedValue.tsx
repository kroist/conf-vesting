import { useDecryptionStore } from "@/store/decryptionStore";
import { useAccount, useSignTypedData } from "wagmi";
import { useFhevm } from "@/hooks/useFhevm";
import { useCallback, useState } from "react";
import { formatUnits, type TypedDataDomain } from "viem";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";

interface EncryptedValueProps {
  ciphertext: `0x${string}`
  contractAddress: `0x${string}`
}

export function EncryptedValue({ ciphertext, contractAddress }: EncryptedValueProps) {

  const { getBalance, setBalance } = useDecryptionStore();
  const decrypted = getBalance(ciphertext);
  const { signTypedDataAsync } = useSignTypedData();
  const { address } = useAccount();

  const { data: instance } = useFhevm();

  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleDecrypt = useCallback(async () => {
    try {
      if (!instance || !address) {
        console.error("FHEVM instance not ready");
        return;
      }
      setIsDecrypting(true);
      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle: ciphertext,
          contractAddress,
        }
      ]
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10'; // String for consistency
      const contractAddresses = [contractAddress];
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
      const decryptedValue = result[ciphertext];
      // if (!decryptedValue) {
      //   setIsDecrypting(false);
      //   console.error("Decryption failed for balance:", ciphertext);
      //   return;
      // }
      setBalance(ciphertext, decryptedValue as bigint);
      setIsDecrypting(false);

    } catch (error) {
      console.error("Error during decryption:", error);
      setIsDecrypting(false);
    }

  }, [instance, address, ciphertext, contractAddress, signTypedDataAsync, setBalance])

  if (decrypted === undefined) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation(); // Prevent click from bubbling to SelectItem
          handleDecrypt();
        }}
        disabled={isDecrypting}
        className="h-auto py-1 px-2 text-muted-foreground"
      >
        {isDecrypting ? (
          <>
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Decrypting...
          </>
        ) : (
          <>🔒 Encrypted</>
        )}
      </Button>
    );
  }

  return (
    <span className="font-bold">{
      formatUnits(decrypted, 6)
    }</span>
  )
}
