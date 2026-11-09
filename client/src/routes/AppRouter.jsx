import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ToastProvider } from "../contexts/ToastContext";
import AdminLayout from "../layouts/AdminLayout";
import PlatformLayout from "../layouts/PlatformLayout";
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
import AuditPage from "../modules/audit/AuditPage";
import PlatformDashboard from "../modules/platform/PlatformDashboard";
import PlatformCompaniesPage from "../modules/platform/PlatformCompaniesPage";
import PlatformDomainsPage from "../modules/platform/PlatformDomainsPage";
import PlatformGlobalMenusPage from "../modules/platform/PlatformGlobalMenusPage";
import PlatformPlansPage from "../modules/platform/PlatformPlansPage";
import PlatformBillingPage from "../modules/platform/PlatformBillingPage";
import PlatformUsersPage from "../modules/platform/PlatformUsersPage";
import PlatformPlaceholderPage from "../modules/platform/PlatformPlaceholderPage";
import TenantEntry from "./TenantEntry";

function PlatformOnly({ children }) {
  const { isPlatformAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function PharmacyOnly({ children }) {
  const { isPlatformAdmin, loading } = useAuth();
  if (loading) return null;
  if (isPlatformAdmin) return <Navigate to="/platform" replace />;
  return children;
}

export default function AppRouter() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/t/:slug" element={<TenantEntry />} />
              <Route path="/t/:slug/*" element={<TenantEntry />} />

              <Route element={<ProtectedRoute />}>
                <Route
                  element={
                    <PlatformOnly>
                      <PlatformLayout />
                    </PlatformOnly>
                  }
                >
                  <Route path="/platform" element={<PlatformDashboard />} />
                  <Route path="/platform/companies" element={<PlatformCompaniesPage />} />
                  <Route path="/platform/domains" element={<PlatformDomainsPage />} />
                  <Route path="/platform/global-menus" element={<PlatformGlobalMenusPage />} />
                  <Route path="/platform/plans" element={<PlatformPlansPage />} />
                  <Route path="/platform/billing" element={<PlatformBillingPage />} />
                  <Route path="/platform/users" element={<PlatformUsersPage />} />
                  <Route path="/platform/*" element={<PlatformPlaceholderPage />} />
                </Route>

                <Route
                  element={
                    <PharmacyOnly>
                      <AdminLayout />
                    </PharmacyOnly>
                  }
                >
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
