import { Badge } from "../ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface PrivacyBadgeProps {
  isDecryptable: boolean;
}

export function PrivacyBadge({ isDecryptable }: PrivacyBadgeProps) {
  if (isDecryptable) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="default" className="gap-1">
              ✅ Decryptable
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>You have permission to decrypt this value</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="secondary" className="gap-1">
            🔒 Encrypted
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>This value is encrypted on-chain</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
