import { useAuth } from "../../contexts/AuthContext";

export default function PermissionGate({ anyOf = [], children, fallback = null }) {
  const { hasPermission } = useAuth();
  if (!anyOf.length || hasPermission(...anyOf)) return children;
  return fallback;
}
