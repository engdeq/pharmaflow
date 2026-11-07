import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";

function Group({ title, rows, tone }) {
  return (
    <div className="card">
      <h3>
        {title} <span className={`badge badge-${tone}`}>{rows.length}</span>
      </h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Batch</th>
              <th>Qty</th>
              <th>Expiry</th>
              <th>Supplier</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{r.medicine?.name}</td>
                <td>{r.batchNumber}</td>
                <td>{r.quantity}</td>
                <td>{new Date(r.expiryDate).toLocaleDateString()}</td>
                <td>{r.supplier?.name || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ExpiryPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/expiry")
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton rows={6} />;

  return (
    <div>
      <PageHeader title="Expiry Management" subtitle="FEFO-ready expiry tracking board" />
      <div style={{ display: "grid", gap: 16 }}>
        <Group title="Expired" rows={data.expired} tone="danger" />
        <Group title="Expiring in 7 Days" rows={data.days7} tone="warning" />
        <Group title="Expiring in 30 Days" rows={data.days30} tone="warning" />
        <Group title="Expiring in 90 Days" rows={data.days90} tone="info" />
        <Group title="Safe Stock" rows={data.safe} tone="success" />
      </div>
    </div>
  );
}
