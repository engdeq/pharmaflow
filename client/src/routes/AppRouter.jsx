import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ToastProvider } from "../contexts/ToastContext";
import AdminLayout from "../layouts/AdminLayout";
import ProtectedRoute from "./ProtectedRoute";
import LoginPage from "./LoginPage";
import DashboardPage from "../modules/dashboard/DashboardPage";
import MedicinesPage from "../modules/medicines/MedicinesPage";
import CategoriesPage from "../modules/categories/CategoriesPage";
import SuppliersPage from "../modules/suppliers/SuppliersPage";
import CustomersPage from "../modules/customers/CustomersPage";
import POSPage from "../modules/sales/POSPage";
import SalesPage from "../modules/sales/SalesPage";
import PurchasesPage from "../modules/purchases/PurchasesPage";
import InventoryPage from "../modules/inventory/InventoryPage";
import ExpiryPage from "../modules/expiry/ExpiryPage";
import UsersPage from "../modules/users/UsersPage";
import RolesPage from "../modules/roles/RolesPage";
import PermissionsPage from "../modules/permissions/PermissionsPage";
import MenusPage from "../modules/menus/MenusPage";
import ReportsPage from "../modules/reports/ReportsPage";
import SettingsPage from "../modules/settings/SettingsPage";
import BrandingPage from "../modules/settings/BrandingPage";
import AuditPage from "../modules/audit/AuditPage";
import PlatformDashboard from "../modules/platform/PlatformDashboard";
import PlatformCompaniesPage from "../modules/platform/PlatformCompaniesPage";

export default function AppRouter() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/platform" element={<PlatformDashboard />} />
                  <Route path="/platform/companies" element={<PlatformCompaniesPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/medicines" element={<MedicinesPage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/sales/pos" element={<POSPage />} />
                  <Route path="/sales" element={<SalesPage />} />
                  <Route path="/purchases" element={<PurchasesPage />} />
                  <Route path="/purchases/create" element={<PurchasesPage />} />
                  <Route path="/purchases/incoming" element={<PurchasesPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/expiry" element={<ExpiryPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/roles" element={<RolesPage />} />
                  <Route path="/permissions" element={<PermissionsPage />} />
                  <Route path="/menus" element={<MenusPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/settings/branding" element={<BrandingPage />} />
                  <Route path="/audit" element={<AuditPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
