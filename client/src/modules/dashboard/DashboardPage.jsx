import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
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
import {
  AlertTriangle,
  Building2,
  Download,
  Package,
  Pill,
  RefreshCw,
  ShoppingBag,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { api } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import "./DashboardPage.css";

const COLORS = ["#748CF8", "#5B76E8", "#3556C7", "#93A8FF", "#3B82F6", "#A5B4FC"];

const KPI_META = [
  { key: "totalSales", label: "Total Sales", icon: ShoppingBag, format: (v) => v },
  {
    key: "todayRevenue",
    label: "Today's Revenue",
    icon: Wallet,
    format: (v) => `$${Number(v).toFixed(2)}`,
  },
  { key: "totalMedicines", label: "Total Medicines", icon: Pill, format: (v) => v },
  { key: "totalCustomers", label: "Total Customers", icon: Users, format: (v) => v },
  { key: "lowStock", label: "Low Stock", icon: AlertTriangle, format: (v) => v },
  { key: "expired", label: "Expired Medicines", icon: Package, format: (v) => v },
  { key: "totalSuppliers", label: "Total Suppliers", icon: Building2, format: (v) => v },
  {
    key: "monthlyRevenue",
    label: "Monthly Revenue",
    icon: Truck,
    format: (v) => `$${Number(v).toFixed(2)}`,
  },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

function MiniSpark({ seed = 3 }) {
  const points = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      i,
      v: 8 + ((seed * (i + 3) * 17) % 20),
    }));
  }, [seed]);

  return (
    <div className="mini-spark">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points}>
          <Area type="monotone" dataKey="v" stroke="#748CF8" fill="rgba(116,140,248,0.2)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [range, setRange] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartMode, setChartMode] = useState("sales");

  const load = () => {
    setLoading(true);
    setError("");
    api(`/dashboard/stats?range=${range}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [range]);

  if (loading) return <Skeleton rows={10} />;
  if (error) return <div className="card">Error: {error}</div>;

  const k = data.kpis;
  const salesOverview = data.charts.salesOverview || [];
  const categories = data.charts.categories || [];
  const topMedicines = data.charts.topMedicines || [];
  const categoryTotal = categories.reduce((s, c) => s + (c.count || 0), 0);

  return (
    <div className="dash-page">
      <section className="dash-hero">
        <div>
          <h1>
            {greeting()}, {user?.fullName || user?.username || "Admin"} 👋
          </h1>
          <p>Here is your pharmacy performance overview for the selected period.</p>
        </div>
        <div className="dash-hero-actions">
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button type="button" className="icon-btn" onClick={load} title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <Download size={16} /> Export Report
          </button>
        </div>
      </section>

      <div className="grid-kpis">
        {KPI_META.map((meta, idx) => {
          const Icon = meta.icon;
          return (
            <div className="kpi-card kpi-card-rich" key={meta.key}>
              <div className="kpi-top">
                <div className="kpi-icon">
                  <Icon size={18} />
                </div>
                <MiniSpark seed={idx + 2} />
              </div>
              <strong>{meta.format(k[meta.key] ?? 0)}</strong>
              <span>{meta.label}</span>
              <small className={idx % 2 === 0 ? "up" : "down"}>
                {idx % 2 === 0 ? "+8.4% vs last period" : "-2.1% vs last period"}
              </small>
            </div>
          );
        })}
      </div>

      <div className="charts-grid dash-charts">
        <div className="card">
          <div className="card-head">
            <h3>Sales Overview</h3>
            <div className="seg">
              <button
                type="button"
                className={chartMode === "sales" ? "active" : ""}
                onClick={() => setChartMode("sales")}
              >
                Sales
              </button>
              <button
                type="button"
                className={chartMode === "revenue" ? "active" : ""}
                onClick={() => setChartMode("revenue")}
              >
                Revenue
              </button>
            </div>
          </div>
          <div style={{ width: "100%", height: 300 }}>
            {salesOverview.length ? (
              <ResponsiveContainer>
                <AreaChart data={salesOverview}>
                  <defs>
                    <linearGradient id="blueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#748CF8" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#748CF8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey={chartMode === "sales" ? "count" : "total"}
                    stroke="#748CF8"
                    fill="url(#blueFill)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No sales data yet" description="Completed sales will appear here." />
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Medicine Categories</h3>
          </div>
          <div className="donut-wrap">
            <div style={{ width: "55%", height: 240 }}>
              {categories.length ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="count"
                      nameKey="_id"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {categories.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No categories" />
              )}
            </div>
            <div className="donut-legend">
              <div className="donut-center-label">{categoryTotal} Medicines</div>
              {categories.map((c, i) => (
                <div key={c._id || i} className="legend-row">
                  <span style={{ background: COLORS[i % COLORS.length] }} />
                  <div>
                    <strong>{c._id}</strong>
                    <small>
                      {c.count} ·{" "}
                      {categoryTotal ? Math.round((c.count / categoryTotal) * 100) : 0}%
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-head">
            <h3>Monthly Sales</h3>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            {salesOverview.length ? (
              <ResponsiveContainer>
                <BarChart data={salesOverview}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#748CF8" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No monthly sales yet" />
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Top Selling Medicines</h3>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            {topMedicines.length ? (
              <ResponsiveContainer>
                <BarChart data={topMedicines} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="_id"
                    width={90}
                    tick={{ fill: "var(--muted)", fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="qty" fill="#5B76E8" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No top sellers yet" />
            )}
          </div>
        </div>
      </div>

      <div className="dash-tables">
        <div className="card">
          <div className="card-head">
            <h3>Recent Sales</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {(data.recentSales || []).length === 0 ? (
                  <tr>
                    <td colSpan={5}>No recent sales.</td>
                  </tr>
                ) : (
                  data.recentSales.map((s) => (
                    <tr key={s._id}>
                      <td>{s.receiptNumber}</td>
                      <td>{s.customer?.name || "Walk-in"}</td>
                      <td>
                        <span className={`badge badge-${s.paymentMethod === "cash" ? "success" : "info"}`}>
                          {s.paymentMethod}
                        </span>
                      </td>
                      <td>${Number(s.total).toFixed(2)}</td>
                      <td>{new Date(s.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Low Stock Alerts</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Qty</th>
                  <th>Min</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(data.lowStockAlerts || []).length === 0 ? (
                  <tr>
                    <td colSpan={4}>All stock levels look healthy.</td>
                  </tr>
                ) : (
                  data.lowStockAlerts.map((row) => (
                    <tr key={row._id}>
                      <td>{row.name}</td>
                      <td style={{ color: "var(--danger)", fontWeight: 700 }}>{row.qty}</td>
                      <td>{row.minStock}</td>
                      <td>
                        <span className={`badge badge-${row.qty <= 0 ? "danger" : "warning"}`}>
                          {row.qty <= 0 ? "Critical" : "Low"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Expiry Notifications</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Purchase</th>
                  <th>Supplier</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(data.recentPurchases || []).length === 0 ? (
                  <tr>
                    <td colSpan={3}>No purchase activity.</td>
                  </tr>
                ) : (
                  data.recentPurchases.map((p) => (
                    <tr key={p._id}>
                      <td>{p.purchaseNumber}</td>
                      <td>{p.supplier?.name || "-"}</td>
                      <td>
                        <span className={`badge badge-${p.status === "approved" ? "success" : "warning"}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
