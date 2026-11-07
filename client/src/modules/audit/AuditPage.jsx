import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";

export default function AuditPage() {
  const [data, setData] = useState({ items: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/audit")
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Immutable activity trail for sensitive actions" />
      <div className="card">
        {loading ? (
          <Skeleton />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((log) => (
                  <tr key={log._id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.user?.username || "-"}</td>
                    <td>{log.module}</td>
                    <td>{log.action}</td>
                    <td>{log.description}</td>
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
