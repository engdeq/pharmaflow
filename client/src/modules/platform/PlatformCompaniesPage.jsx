import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";
import StatusSwitch from "../../components/ui/StatusSwitch";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function PlatformCompaniesPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api("/platform/companies", { silent: true });
      setItems(res.data || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (company, status) => {
    try {
      await api(`/platform/companies/${company._id}/status`, {
        method: "PUT",
        body: { status },
        successMessage: `Company ${status}`,
      });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader title="Companies" subtitle="Register, activate, or suspend pharmacy tenants" />
      <div className="card">
        {loading ? (
          <Skeleton />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pharmacy</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <strong>{c.name}</strong>
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>{c.city || c.country}</div>
                    </td>
                    <td>{c.email}</td>
                    <td>{c.subscription?.plan || "-"}</td>
                    <td>
                      <span className={`badge badge-${c.status === "active" ? "success" : "warning"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <StatusSwitch
                        checked={c.status === "active"}
                        onChange={(on) => setStatus(c, on ? "active" : "suspended")}
                      />
                    </td>
                    <td>
                      {c.status === "pending" ? (
                        <button type="button" className="btn btn-primary" onClick={() => setStatus(c, "active")}>
                          Approve
                        </button>
                      ) : (
                        "-"
                      )}
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
