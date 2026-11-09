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
import PlatformPlaceholderPage from "../modules/platform/PlatformPlaceholderPage";

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

function TenantPathRedirect() {
  // Dev helper: /t/:slug/* → same app routes (tenant resolved server-side by path/host)
  return <Navigate to="/dashboard" replace />;
}

export default function AppRouter() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/t/:slug/*" element={<TenantPathRedirect />} />

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
                  <Route
                    path="/platform/approvals"
                    element={
                      <PlatformPlaceholderPage
                        title="Company Approvals"
                        subtitle="Review and activate pending pharmacy registrations"
                      />
                    }
                  />
                  <Route
                    path="/platform/branches"
                    element={
                      <PlatformPlaceholderPage
                        title="Company Branches"
                        subtitle="Cross-tenant branch overview for support and billing"
                      />
                    }
                  />
                  <Route
                    path="/platform/activity"
                    element={
                      <PlatformPlaceholderPage
                        title="Company Activity"
                        subtitle="Platform-level activity feed across pharmacies"
                      />
                    }
                  />
                  <Route
                    path="/platform/global-menus"
                    element={
                      <PlatformPlaceholderPage
                        title="Global Menu Management"
                        nextStep="Central menu catalog — tenants derive their menus from this catalog."
                      />
                    }
                  />
                  <Route
                    path="/platform/modules"
                    element={
                      <PlatformPlaceholderPage
                        title="Module Management"
                        nextStep="Assign CORE / BUSINESS / ADVANCED modules per company."
                      />
                    }
                  />
                  <Route
                    path="/platform/features"
                    element={<PlatformPlaceholderPage title="Feature Management" />}
                  />
                  <Route
                    path="/platform/plans"
                    element={<PlatformPlaceholderPage title="Subscription Plans" />}
                  />
                  <Route
                    path="/platform/billing"
                    element={<PlatformPlaceholderPage title="Billing Management" />}
                  />
                  <Route
                    path="/platform/users"
                    element={<PlatformPlaceholderPage title="Platform Users" />}
                  />
                  <Route
                    path="/platform/roles"
                    element={<PlatformPlaceholderPage title="Platform Roles" />}
                  />
                  <Route
                    path="/platform/permissions"
                    element={<PlatformPlaceholderPage title="Platform Permissions" />}
                  />
                  <Route
                    path="/platform/audit"
                    element={<PlatformPlaceholderPage title="Platform Audit Logs" />}
                  />
                  <Route
                    path="/platform/settings"
                    element={<PlatformPlaceholderPage title="Platform Settings" />}
                  />
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
