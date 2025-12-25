import { useNavigationStore } from "../../store/navigationStore";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { EncryptedValue } from "../privacy/EncryptedValue";
import { VestedAmountCalculator } from "../privacy/VestedAmountCalculator";
import { useVestings } from "@/hooks/useVestings";
import { DepositTokens } from "../vesting/DepositTokens";
import { ClaimTokens } from "../vesting/ClaimTokens";
import { useEmployeeVestings } from "@/hooks/useEmployeeVestings";
import type { MockVesting } from "@/lib/mockData";

export function VestingDetail() {
  const { selectedVestingId, role, goBack } = useNavigationStore();

  const { data: employerVestings } = useVestings();
  const { data: employeeVestings } = useEmployeeVestings();
  let allVestings: MockVesting[] = [];
  if (employerVestings) {
    allVestings = employerVestings
  }
  if (employeeVestings) {
    allVestings = [
      ...allVestings,
      ...employeeVestings
    ]
  }
  const vesting = allVestings?.find(v => v.id === selectedVestingId);

  if (!vesting) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Vesting not found</p>
            <Button className="mt-4" onClick={goBack}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Determine if user is authorized (owner or beneficiary)
  const isAuthorized = true; // In real app, check if connected wallet matches

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Back Button */}
      <Button variant="outline" onClick={goBack}>
        ← Back
      </Button>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                {vesting.tokenSymbol} Vesting
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Token: {vesting.tokenAddress}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Public Information */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Owner (Employer)</p>
              <p className="font-mono">{vesting.owner}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Beneficiary (Employee)</p>
              <p className="font-mono">{vesting.beneficiary}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-medium">{formatDate(vesting.startTimestamp)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End Date</p>
              <p className="font-medium">{formatDate(vesting.endTimestamp)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Funding Status</p>
          </div>
        </CardContent>
      </Card>

      {/* Private Accounting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔒 Private Accounting
            {!isAuthorized && (
              <Badge variant="secondary">Not Authorized</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isAuthorized ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Allocation</p>
                <p className="text-2xl font-bold">
                  <EncryptedValue
                    ciphertext={vesting.totalAllocation}
                    contractAddress={vesting.id as `0x${string}`}
                  />
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Already Claimed</p>
                <p className="text-2xl font-bold">
                  <EncryptedValue
                    ciphertext={vesting.released}
                    contractAddress={vesting.id as `0x${string}`}
                  />
                </p>
              </div>
              <Separator />
              <VestedAmountCalculator
                totalAllocation={vesting.totalAllocation}
                released={vesting.released}
                contractAddress={vesting.id as `0x${string}`}
                startTimestamp={vesting.startTimestamp}
                endTimestamp={vesting.endTimestamp}
              />
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                🔒 Encrypted (not authorized to decrypt)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {role === "employer" && (
            <DepositTokens
              vestingWalletAddress={vesting.id as `0x${string}`}
              tokenAddress={vesting.tokenAddress as `0x${string}`}
              tokenSymbol={vesting.tokenSymbol}
            />
          )}

          {role === "employee" && (
            <ClaimTokens
              vestingWalletAddress={vesting.id as `0x${string}`}
              tokenAddress={vesting.tokenAddress as `0x${string}`}
              tokenSymbol={vesting.tokenSymbol}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
