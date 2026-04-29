import { lazy, Suspense } from "react";
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

// Admin and compare pages are lazy-loaded — most users never visit them, and
// this keeps the initial bundle a chunk smaller.
const Rubrics = lazy(() => import("./pages/admin/Rubrics"));
const RubricEditor = lazy(() => import("./pages/admin/RubricEditor"));
const Users = lazy(() => import("./pages/admin/Users"));
const AuditLog = lazy(() => import("./pages/admin/AuditLog"));
const CsvImport = lazy(() => import("./pages/admin/CsvImport"));
const GamificationAdmin = lazy(() => import("./pages/admin/Gamification"));
const LeagueStandings = lazy(() => import("./pages/admin/LeagueStandings"));
const CalibrationList = lazy(() =>
  import("./pages/admin/Calibration").then((m) => ({ default: m.CalibrationList })),
);
const CalibrationDetail = lazy(() =>
  import("./pages/admin/Calibration").then((m) => ({ default: m.CalibrationDetail })),
);
const TrainingModules = lazy(() => import("./pages/admin/TrainingModules"));
const Config = lazy(() => import("./pages/admin/Config"));
const CompareShops = lazy(() => import("./pages/CompareShops"));

function Require({ roles, children }: { roles?: Role[]; children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Lazy({ children }: { children: JSX.Element }) {
  return <Suspense fallback={<div className="p-8 text-slate-500">Loading…</div>}>{children}</Suspense>;
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
        <Route path="shops/compare" element={<Lazy><CompareShops /></Lazy>} />
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
              <Lazy><Rubrics /></Lazy>
            </Require>
          }
        />
        <Route
          path="admin/rubrics/:id"
          element={
            <Require roles={["admin"]}>
              <Lazy><RubricEditor /></Lazy>
            </Require>
          }
        />
        <Route
          path="admin/users"
          element={
            <Require roles={["admin"]}>
              <Lazy><Users /></Lazy>
            </Require>
          }
        />
        <Route
          path="admin/audit-log"
          element={
            <Require roles={["admin"]}>
              <Lazy><AuditLog /></Lazy>
            </Require>
          }
        />
        <Route
          path="admin/import"
          element={
            <Require roles={["admin"]}>
              <Lazy><CsvImport /></Lazy>
            </Require>
          }
        />
        <Route
          path="admin/gamification"
          element={
            <Require roles={["admin"]}>
              <Lazy><GamificationAdmin /></Lazy>
            </Require>
          }
        />
        <Route
          path="admin/leagues/:id"
          element={
            <Require roles={["admin", "district_manager"]}>
              <Lazy><LeagueStandings /></Lazy>
            </Require>
          }
        />
        <Route
          path="admin/training"
          element={
            <Require roles={["admin"]}>
              <Lazy><TrainingModules /></Lazy>
            </Require>
          }
        />
        <Route
          path="admin/config"
          element={
            <Require roles={["admin"]}>
              <Lazy><Config /></Lazy>
            </Require>
          }
        />
        <Route
          path="admin/calibration"
          element={
            <Require roles={["admin", "district_manager"]}>
              <Lazy><CalibrationList /></Lazy>
            </Require>
          }
        />
        <Route
          path="admin/calibration/:id"
          element={
            <Require roles={["admin", "district_manager", "store_manager"]}>
              <Lazy><CalibrationDetail /></Lazy>
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
