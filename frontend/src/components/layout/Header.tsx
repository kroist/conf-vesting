import { ConnectKitButton } from "connectkit";
import { useNavigationStore } from "../../store/navigationStore";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

export function Header() {
  const { role, setRole, navigateTo } = useNavigationStore();

  const handleRoleChange = (checked: boolean) => {
    const newRole = checked ? "employee" : "employer";
    setRole(newRole);
    // Navigate to appropriate dashboard when role changes
    navigateTo(newRole === "employer" ? "employer-dashboard" : "employee-dashboard");
  };

  const handleLogoClick = () => {
    const dashboard = role === "employer" ? "employer-dashboard" : "employee-dashboard";
    navigateTo(dashboard);
  };

  return (
    <header className="border-b border-border bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo / Title */}
          <button
            onClick={handleLogoClick}
            className="text-xl font-bold hover:opacity-80 transition-opacity"
          >
            🔒 Confidential Vesting
          </button>

          {/* Role Toggle + Wallet */}
          <div className="flex items-center gap-6">
            {/* Role Toggle */}
            <div className="flex items-center gap-3">
              <Label htmlFor="role-toggle" className="text-sm font-medium">
                Employer
              </Label>
              <Switch
                id="role-toggle"
                checked={role === "employee"}
                onCheckedChange={handleRoleChange}
              />
              <Label htmlFor="role-toggle" className="text-sm font-medium">
                Employee
              </Label>
            </div>

            {/* Wallet Connection */}
            <ConnectKitButton />
          </div>
        </div>
      </div>
    </header>
  );
}
