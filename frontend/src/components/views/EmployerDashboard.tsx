import { mockTokens } from "../../lib/mockData";
import { useNavigationStore } from "../../store/navigationStore";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { TokenTable } from "../tokens/TokenTable";
import { VestingTable } from "../vesting/VestingTable";
import { PrivacyBanner } from "../privacy/PrivacyBanner";
import { useVestings } from "@/hooks/useVestings";

export function EmployerDashboard() {
  const { navigateTo } = useNavigationStore();

  const { data: vestingsList } = useVestings();

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header with inline stats */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Employer Dashboard</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary" className="px-3 py-1">
                Total: {vestingsList?.length ?? 0}
              </Badge>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              size="lg"
              onClick={() => navigateTo("create-vesting")}
            >
              + Create New Vesting
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Manage vesting schedules and confidential tokens
        </p>
      </div>

      {/* Privacy Banner */}
      <PrivacyBanner />

      {/* Two-column layout: Tokens (left) and Vestings (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vestings Section */}
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-2xl font-semibold">Created Vestings</h2>
          <VestingTable viewMode="employer" />
        </div>
        {/* Tokens Section */}
        <div className="space-y-4 lg:col-span-1">
          <h2 className="text-2xl font-semibold">Confidential Tokens</h2>
          <TokenTable tokens={mockTokens} />
        </div>
      </div>
    </div>
  );
}
