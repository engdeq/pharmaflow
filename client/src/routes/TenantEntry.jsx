import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";

/** Entry: /t/:slug → remember pharmacy + open login for that tenant */
export default function TenantEntry() {
  const { slug } = useParams();
  const clean = String(slug || "")
    .trim()
    .toLowerCase();

  useEffect(() => {
    if (clean) {
      sessionStorage.setItem("medaxis_tenant_slug", clean);
      localStorage.setItem("medaxis_tenant_slug", clean);
    }
  }, [clean]);

  if (!clean) return <Navigate to="/" replace />;
  return <Navigate to={`/?pharmacy=${encodeURIComponent(clean)}`} replace />;
}
