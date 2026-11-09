import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function PlatformDomainsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/platform/domains", { silent: true })
      .then((res) => setItems(res.data || []))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Company Domains"
        subtitle="Subdomains and custom domains — resolved server-side from hostname"
      />
      <div className="card">
        {loading ? (
          <Skeleton />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Hostname</th>
                  <th>Type</th>
                  <th>Primary</th>
                  <th>Status</th>
                  <th>SSL</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ color: "var(--muted)" }}>
                      No domains yet. Registering a pharmacy creates{" "}
                      <code>{"{slug}.medaxis.dirshay.com"}</code> (DNS/SSL must be verified before live).
                    </td>
                  </tr>
                ) : (
                  items.map((d) => (
                    <tr key={d._id}>
                      <td>{d.companyId?.name || d.tenantId?.name || "-"}</td>
                      <td>
                        <code>{d.hostname}</code>
                      </td>
                      <td>{d.type}</td>
                      <td>{d.isPrimary ? "Yes" : "No"}</td>
                      <td>{d.status}</td>
                      <td>{d.sslStatus}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
