import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Skeleton from "../components/ui/Skeleton";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        <Skeleton rows={6} />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
