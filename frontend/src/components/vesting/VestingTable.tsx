import { useNavigationStore } from "../../store/navigationStore";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { useVestings } from "@/hooks/useVestings";

interface VestingTableProps {
  viewMode: "employer" | "employee";
}

export function VestingTable({ viewMode }: VestingTableProps) {
  const { selectVesting } = useNavigationStore();

  const { data: vestings } = useVestings();


  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (!vestings) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground mb-3">Loading...</p>
      </div>
    );

  }

  if (vestings.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground mb-3">No vestings yet</p>
        <Button
          size="sm"
          onClick={() => useNavigationStore.getState().navigateTo("create-vesting")}
        >
          Create Your First Vesting
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead>
              {viewMode === "employer" ? "Beneficiary" : "Employer"}
            </TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vestings.map((vesting) => (
            <TableRow
              key={vesting.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => selectVesting(vesting.id)}
            >
              <TableCell className="font-semibold">
                <div>
                  <div>{vesting.tokenSymbol}</div>
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {viewMode === "employer"
                  ? `${vesting.beneficiary.slice(0, 6)}...${vesting.beneficiary.slice(-4)}`
                  : `${vesting.owner.slice(0, 6)}...${vesting.owner.slice(-4)}`}
              </TableCell>
              <TableCell className="text-sm">
                <div>
                  <div>{formatDate(vesting.startTimestamp)}</div>
                  <div className="text-muted-foreground">
                    → {formatDate(vesting.endTimestamp)}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectVesting(vesting.id);
                  }}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
