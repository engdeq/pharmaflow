import { useEffect, useState } from "react";
import { Building2, GitBranch, PauseCircle, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

const PIE_COLORS = ["#315FF4", "#5A6FD8", "#22C55E", "#F59E0B", "#EF4444"];

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
    { label: "Total Companies", value: stats?.totalCompanies ?? 0, icon: Building2 },
    { label: "Active", value: stats?.activeCompanies ?? 0, icon: Building2 },
    { label: "Pending", value: stats?.pendingCompanies ?? 0, icon: PauseCircle },
    { label: "Suspended", value: stats?.suspendedCompanies ?? 0, icon: PauseCircle },
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users },
    { label: "Total Branches", value: stats?.totalBranches ?? 0, icon: GitBranch },
    { label: "Active Subscriptions", value: stats?.activeSubscriptions ?? stats?.activeCompanies ?? 0, icon: Building2 },
    { label: "Trial Companies", value: stats?.trialCompanies ?? 0, icon: Building2 },
  ];

  const growth = stats?.registrationGrowth || [
    { name: "Mon", companies: stats?.totalCompanies || 0 },
    { name: "Tue", companies: Math.max(0, (stats?.totalCompanies || 0) - 1) },
    { name: "Wed", companies: stats?.activeCompanies || 0 },
    { name: "Thu", companies: stats?.pendingCompanies || 0 },
    { name: "Fri", companies: stats?.totalUsers || 0 },
  ];

  const plans = stats?.subscriptionDistribution || [
    { name: "Trial", value: stats?.trialCompanies || 0 },
    { name: "Active", value: stats?.activeCompanies || 0 },
    { name: "Suspended", value: stats?.suspendedCompanies || 0 },
  ];

  return (
    <div>
      <PageHeader
        title="MedAxis Control Center"
        subtitle="Pharmacy SaaS Administration — companies, domains, modules, and platform health"
      />

      <div className="grid-kpis">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="kpi-card" style={{ borderColor: "#E3E9F5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>{c.label}</span>
                <Icon size={16} color="#315FF4" />
              </div>
              <strong>{c.value}</strong>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginTop: 16 }}>
        <div className="card" style={{ padding: 16, minHeight: 320 }}>
          <h3 style={{ marginTop: 0 }}>Company Registration Growth</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E9F5" />
              <XAxis dataKey="name" stroke="#6B7A99" />
              <YAxis stroke="#6B7A99" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="companies" fill="#315FF4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ padding: 16, minHeight: 320 }}>
          <h3 style={{ marginTop: 0 }}>Subscription Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={plans} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                {plans.map((entry, i) => (
                  <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
