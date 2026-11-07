import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function ReportsPage() {
  const toast = useToast();
  const [type, setType] = useState("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const res = await api(`/reports/${type}?${qs.toString()}`);
      setResult(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    window.print();
  };

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Sales, purchases, inventory and P&L"
        actions={
          <button type="button" className="btn btn-ghost" onClick={exportCsv}>
            Print / Export
          </button>
        }
      />

      <div className="card toolbar">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="sales">Sales Report</option>
          <option value="purchases">Purchase Report</option>
          <option value="inventory">Inventory Report</option>
          <option value="profit-loss">Profit & Loss</option>
          <option value="customers">Customer Report</option>
          <option value="suppliers">Supplier Report</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" className="btn btn-primary" onClick={run} disabled={loading}>
          {loading ? "Loading..." : "Generate"}
        </button>
      </div>

      <div className="card">
        {!result ? (
          <p style={{ color: "var(--muted)" }}>Select a report and generate results.</p>
        ) : type === "profit-loss" ? (
          <div className="grid-kpis">
            <div className="kpi-card"><span>Revenue</span><strong>${Number(result.revenue).toFixed(2)}</strong></div>
            <div className="kpi-card"><span>Purchases</span><strong>${Number(result.purchases).toFixed(2)}</strong></div>
            <div className="kpi-card"><span>Gross Profit</span><strong>${Number(result.grossProfit).toFixed(2)}</strong></div>
            <div className="kpi-card"><span>Sales Count</span><strong>{result.salesCount}</strong></div>
          </div>
        ) : type === "inventory" ? (
          <>
            <p>Stock valuation: <strong>${Number(result.valuation).toFixed(2)}</strong></p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Batch</th>
                    <th>Qty</th>
                    <th>Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.batches || []).map((b) => (
                    <tr key={b._id}>
                      <td>{b.medicine?.name}</td>
                      <td>{b.batchNumber}</td>
                      <td>{b.quantity}</td>
                      <td>{new Date(b.expiryDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : type === "sales" ? (
          <>
            <p>
              Count: {result.summary?.count} | Total: ${Number(result.summary?.total || 0).toFixed(2)}
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Cashier</th>
                    <th>Total</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.items || []).map((s) => (
                    <tr key={s._id}>
                      <td>{s.receiptNumber}</td>
                      <td>{s.cashier?.username}</td>
                      <td>${Number(s.total).toFixed(2)}</td>
                      <td>{new Date(s.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(result) ? result : []).map((row) => (
                  <tr key={row._id}>
                    <td>{row.name || row.purchaseNumber}</td>
                    <td>
                      {row.phone ||
                        row.email ||
                        row.status ||
                        `$${Number(row.totalCost || row.totalSpending || 0).toFixed(2)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
