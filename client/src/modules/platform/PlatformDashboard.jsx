import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function PlatformDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/platform/stats", { silent: true })
      .then((res) => setStats(res.data))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;

  const cards = [
    { label: "Total Companies", value: stats?.totalCompanies ?? 0 },
    { label: "Active", value: stats?.activeCompanies ?? 0 },
    { label: "Suspended", value: stats?.suspendedCompanies ?? 0 },
    { label: "Pending", value: stats?.pendingCompanies ?? 0 },
    { label: "Total Users", value: stats?.totalUsers ?? 0 },
    { label: "Total Branches", value: stats?.totalBranches ?? 0 },
  ];

  return (
    <div>
      <PageHeader
        title="Platform Dashboard"
        subtitle="Super Admin overview of all pharmacy companies"
      />
      <div className="grid-kpis">
        {cards.map((c) => (
          <div key={c.label} className="kpi-card">
            <span>{c.label}</span>
            <strong>{c.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
