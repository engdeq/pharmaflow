import { Navigate, useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, loadSession } = useAuth();

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthCard
      onLoginSuccess={async () => {
        await loadSession();
        navigate("/dashboard");
      }}
    />
  );
}
