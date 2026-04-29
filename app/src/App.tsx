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
            <Route path="admin/rubrics" element={<AdminRubrics />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
