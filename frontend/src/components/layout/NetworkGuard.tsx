import { useAccount, useChainId } from "wagmi";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";

interface NetworkGuardProps {
  children: React.ReactNode;
}

export function NetworkGuard({ children }: NetworkGuardProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  // Sepolia chain ID is 11155111
  const SEPOLIA_CHAIN_ID = 11155111;
  const isCorrectNetwork = chainId === SEPOLIA_CHAIN_ID;

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Alert>
          <AlertTitle>Wallet Not Connected</AlertTitle>
          <AlertDescription>
            Please connect your wallet to use Confidential Vesting.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Alert variant="destructive">
          <AlertTitle>Wrong Network</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>
              This app only works on Sepolia testnet. Please switch your network.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                // In a real app, this would trigger network switch
                console.log("Switch network clicked");
              }}
            >
              Switch to Sepolia
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
