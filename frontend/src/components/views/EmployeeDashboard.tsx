import { useEmployeeVestings } from "@/hooks/useEmployeeVestings";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { VestingCard } from "../vesting/VestingCard";

export function EmployeeDashboard() {

  const { data: employeeVestings } = useEmployeeVestings();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Employee Dashboard</h1>
        <p className="text-muted-foreground">
          View and claim your vested tokens
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Incoming Vestings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{employeeVestings?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Vesting List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Incoming Vestings</h2>
        {
          employeeVestings ? (
            employeeVestings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No incoming vestings</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employeeVestings.map((vesting) => (
                  <VestingCard
                    key={vesting.id}
                    vesting={vesting}
                    viewMode="employee"
                  />
                ))}
              </div>
            )
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>

          )
        }

      </div>
    </div>
  );
}
