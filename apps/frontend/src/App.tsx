import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./Layout";
import { StoreProvider } from "./store";
import Dashboard from "./pages/Dashboard";
import ShopList from "./pages/ShopList";
import ShopDetail from "./pages/ShopDetail";
import ShopWizard from "./pages/ShopWizard";
import ActionPlans from "./pages/ActionPlans";
import Appeals from "./pages/Appeals";
import AdminRubrics from "./pages/AdminRubrics";
import AdminUsers from "./pages/AdminUsers";
import MyPoints from "./pages/MyPoints";
import Leaderboard from "./pages/Leaderboard";
import Challenges from "./pages/Challenges";
import Hunt from "./pages/Hunt";
import AdminConfig from "./pages/AdminConfig";
import Analytics from "./pages/Analytics";
import AgencyImport from "./pages/AgencyImport";
import Training from "./pages/Training";
import WeeklyDigest from "./pages/WeeklyDigest";
import AuditLog from "./pages/AuditLog";
import Settings from "./pages/Settings";
import Calibration from "./pages/Calibration";

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="shops" element={<ShopList />} />
            <Route path="shops/new" element={<ShopWizard />} />
            <Route path="shops/:id" element={<ShopDetail />} />
            <Route path="action-plans" element={<ActionPlans />} />
            <Route path="appeals" element={<Appeals />} />
            <Route path="training" element={<Training />} />
            <Route path="settings" element={<Settings />} />
            <Route path="digest" element={<WeeklyDigest />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="me/points" element={<MyPoints />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="challenges" element={<Challenges />} />
            <Route path="hunt" element={<Hunt />} />
            <Route path="admin/rubrics" element={<AdminRubrics />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/import" element={<AgencyImport />} />
            <Route path="admin/config" element={<AdminConfig />} />
            <Route path="admin/audit" element={<AuditLog />} />
            <Route path="admin/calibration" element={<Calibration />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
