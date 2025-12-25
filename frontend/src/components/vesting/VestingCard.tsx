import type { MockVesting } from "../../lib/mockData";
import { useNavigationStore } from "../../store/navigationStore";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";

interface VestingCardProps {
  vesting: MockVesting;
  viewMode: "employer" | "employee";
}

export function VestingCard({ vesting, viewMode }: VestingCardProps) {
  const { selectVesting } = useNavigationStore();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => selectVesting(vesting.id)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{vesting.tokenSymbol}</h3>
            <p className="text-sm text-muted-foreground">
              {viewMode === "employer"
                ? `Beneficiary: ${vesting.beneficiary}`
                : `Employer: ${vesting.owner}`
              }
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Start</p>
            <p className="font-medium">{formatDate(vesting.startTimestamp)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">End</p>
            <p className="font-medium">{formatDate(vesting.endTimestamp)}</p>
          </div>
        </div>

      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            selectVesting(vesting.id);
          }}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
