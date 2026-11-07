import { useEffect, useState } from "react";
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
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";

const COLORS = ["#10B981", "#2563EB", "#D97706", "#E11D48", "#64748B", "#064E3B"];

export default function DashboardPage() {
  const [range, setRange] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api(`/dashboard/stats?range=${range}`)
      .then((res) => {
        if (alive) setData(res.data);
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [range]);

  if (loading) return <Skeleton rows={8} />;
  if (error) return <div className="card">Error: {error}</div>;

  const k = data.kpis;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Live pharmacy performance overview"
        actions={
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        }
      />

      <div className="grid-kpis">
        {[
          ["Total Sales", k.totalSales],
          ["Today's Revenue", `$${Number(k.todayRevenue).toFixed(2)}`],
          ["Total Medicines", k.totalMedicines],
          ["Total Customers", k.totalCustomers],
          ["Low Stock", k.lowStock],
          ["Expired", k.expired],
          ["Suppliers", k.totalSuppliers],
          ["Monthly Revenue", `$${Number(k.monthlyRevenue).toFixed(2)}`],
        ].map(([label, value]) => (
          <div className="kpi-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card">
          <h3>Sales Overview</h3>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={data.charts.salesOverview}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#10B981" fill="rgba(16,185,129,0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3>Categories</h3>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.charts.categories} dataKey="count" nameKey="_id" outerRadius={90} label>
                  {data.charts.categories.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <h3>Top Selling Medicines</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={data.charts.topMedicines}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="_id" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="qty" fill="#2563EB" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3>Low Stock Alerts</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Qty</th>
                  <th>Min</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={3}>All stock levels look healthy.</td>
                  </tr>
                ) : (
                  data.lowStockAlerts.map((row) => (
                    <tr key={row._id}>
                      <td>{row.name}</td>
                      <td>{row.qty}</td>
                      <td>{row.minStock}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3>Recent Sales</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Customer</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.map((s) => (
                  <tr key={s._id}>
                    <td>{s.receiptNumber}</td>
                    <td>{s.customer?.name || "Walk-in"}</td>
                    <td>${Number(s.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3>Recent Purchases</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Supplier</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPurchases.map((p) => (
                  <tr key={p._id}>
                    <td>{p.purchaseNumber}</td>
                    <td>{p.supplier?.name || "-"}</td>
                    <td>
                      <span className={`badge badge-${p.status === "approved" ? "success" : "warning"}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
