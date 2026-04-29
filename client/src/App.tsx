import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { useAuth, type Role } from "./auth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ShopList from "./pages/ShopList";
import ShopWizard from "./pages/ShopWizard";
import ShopDetail from "./pages/ShopDetail";
import ActionPlans from "./pages/ActionPlans";
import Appeals from "./pages/Appeals";
import Gamification from "./pages/Gamification";
import Training from "./pages/Training";
import HeatmapPage from "./pages/Heatmap";
import Settings from "./pages/Settings";
import District from "./pages/District";
import Rubrics from "./pages/admin/Rubrics";
import RubricEditor from "./pages/admin/RubricEditor";
import Users from "./pages/admin/Users";
import AuditLog from "./pages/admin/AuditLog";
import CsvImport from "./pages/admin/CsvImport";
import GamificationAdmin from "./pages/admin/Gamification";
import LeagueStandings from "./pages/admin/LeagueStandings";
import { CalibrationList, CalibrationDetail } from "./pages/admin/Calibration";
import TrainingModules from "./pages/admin/TrainingModules";
import Config from "./pages/admin/Config";

function Require({ roles, children }: { roles?: Role[]; children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Require>
            <Layout />
          </Require>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="shops" element={<ShopList />} />
        <Route
          path="shops/new"
          element={
            <Require roles={["store_manager", "district_manager", "admin"]}>
              <ShopWizard />
            </Require>
          }
        />
        <Route path="shops/:id" element={<ShopDetail />} />
        <Route path="action-plans" element={<ActionPlans />} />
        <Route path="appeals" element={<Appeals />} />
        <Route path="recognition" element={<Gamification />} />
        <Route path="training" element={<Training />} />
        <Route path="settings" element={<Settings />} />
        <Route
          path="heatmap"
          element={
            <Require roles={["store_manager", "district_manager", "admin"]}>
              <HeatmapPage />
            </Require>
          }
        />
        <Route
          path="admin/rubrics"
          element={
            <Require roles={["admin"]}>
              <Rubrics />
            </Require>
          }
        />
        <Route
          path="admin/rubrics/:id"
          element={
            <Require roles={["admin"]}>
              <RubricEditor />
            </Require>
          }
        />
        <Route
          path="admin/users"
          element={
            <Require roles={["admin"]}>
              <Users />
            </Require>
          }
        />
        <Route
          path="admin/audit-log"
          element={
            <Require roles={["admin"]}>
              <AuditLog />
            </Require>
          }
        />
        <Route
          path="admin/import"
          element={
            <Require roles={["admin"]}>
              <CsvImport />
            </Require>
          }
        />
        <Route
          path="admin/gamification"
          element={
            <Require roles={["admin"]}>
              <GamificationAdmin />
            </Require>
          }
        />
        <Route
          path="admin/leagues/:id"
          element={
            <Require roles={["admin", "district_manager"]}>
              <LeagueStandings />
            </Require>
          }
        />
        <Route
          path="admin/training"
          element={
            <Require roles={["admin"]}>
              <TrainingModules />
            </Require>
          }
        />
        <Route
          path="admin/config"
          element={
            <Require roles={["admin"]}>
              <Config />
            </Require>
          }
        />
        <Route
          path="admin/calibration"
          element={
            <Require roles={["admin", "district_manager"]}>
              <CalibrationList />
            </Require>
          }
        />
        <Route
          path="admin/calibration/:id"
          element={
            <Require roles={["admin", "district_manager", "store_manager"]}>
              <CalibrationDetail />
            </Require>
          }
        />
        <Route
          path="districts/:name"
          element={
            <Require roles={["district_manager", "admin"]}>
              <District />
            </Require>
          }
        />
      </Route>
    </Routes>
  );
}
