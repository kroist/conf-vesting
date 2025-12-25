import { useNavigationStore } from "./store/navigationStore";
import { Header } from "./components/layout/Header";
import { NetworkGuard } from "./components/layout/NetworkGuard";
import { EmployerDashboard } from "./components/views/EmployerDashboard";
import { EmployeeDashboard } from "./components/views/EmployeeDashboard";
import { VestingDetail } from "./components/views/VestingDetail";
import { CreateVesting } from "./components/views/CreateVesting";

function App() {
  const { currentView } = useNavigationStore();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NetworkGuard>
        {currentView === "employer-dashboard" && <EmployerDashboard />}
        {currentView === "employee-dashboard" && <EmployeeDashboard />}
        {currentView === "create-vesting" && <CreateVesting />}
        {currentView === "vesting-detail" && <VestingDetail />}
      </NetworkGuard>
    </div>
  );
}

export default App;
