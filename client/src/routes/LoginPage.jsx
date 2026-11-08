import { Navigate, useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, loadSession, isPlatformAdmin } = useAuth();

  if (!loading && isAuthenticated) {
    return <Navigate to={isPlatformAdmin ? "/platform" : "/dashboard"} replace />;
  }

  return (
    <AuthCard
      onLoginSuccess={async () => {
        const sessionUser = await loadSession();
        navigate(sessionUser?.isPlatformAdmin ? "/platform" : "/dashboard");
      }}
    />
  );
}
