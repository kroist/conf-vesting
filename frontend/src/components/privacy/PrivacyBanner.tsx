import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

export function PrivacyBanner() {
  return (
    <Alert className="bg-primary/5 border-primary/20">
      <AlertTitle className="flex items-center gap-2">
        🔒 Privacy First
      </AlertTitle>
      <AlertDescription>
        Balances are encrypted on-chain. Only your browser can decrypt them. The
        blockchain enforces the rules, the math is encrypted, and only you see
        the numbers.
      </AlertDescription>
    </Alert>
  );
}
