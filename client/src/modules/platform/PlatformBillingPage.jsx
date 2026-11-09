import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function PlatformBillingPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api("/platform/billing", { silent: true });
      setData(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changePlan = async (companyId, plan) => {
    try {
      await api(`/platform/billing/${companyId}/plan`, {
        method: "PUT",
        body: { plan },
        successMessage: "Plan updated",
      });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading || !data) return <Skeleton />;

  const { rows = [], summary = {}, plans = [] } = data;

  return (
    <div>
      <PageHeader title="Billing Management" subtitle="Company subscriptions, trials, and monthly revenue" />

      <div className="grid-kpis" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <span>Companies</span>
          <strong>{summary.companies ?? 0}</strong>
        </div>
        <div className="kpi-card">
          <span>Active</span>
          <strong>{summary.active ?? 0}</strong>
        </div>
        <div className="kpi-card">
          <span>Trialing</span>
          <strong>{summary.trialing ?? 0}</strong>
        </div>
        <div className="kpi-card">
          <span>MRR</span>
          <strong>${summary.mrr ?? 0}</strong>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pharmacy</th>
                <th>Status</th>
                <th>Plan</th>
                <th>Sub Status</th>
                <th>Price / mo</th>
                <th>Trial Ends</th>
                <th>Change Plan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.companyId}>
                  <td>
                    <strong>{r.name}</strong>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>{r.slug}</div>
                  </td>
                  <td>
                    <span className={`badge badge-${r.status === "active" ? "success" : "warning"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>{r.planName}</td>
                  <td>{r.subscriptionStatus}</td>
                  <td>
                    ${r.priceMonthly} {r.currency}
                  </td>
                  <td>{r.trialEndsAt ? new Date(r.trialEndsAt).toLocaleDateString() : "-"}</td>
                  <td>
                    <select
                      value={r.plan}
                      onChange={(e) => changePlan(r.companyId, e.target.value)}
                      style={{ minWidth: 140 }}
                    >
                      {plans.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
