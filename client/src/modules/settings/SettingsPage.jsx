import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function SettingsPage() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/settings")
      .then((res) => setForm(res.data))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    try {
      const res = await api("/settings", { method: "PUT", body: form });
      setForm(res.data);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading || !form) return <Skeleton />;

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Pharmacy profile and system configuration"
        actions={
          <button type="button" className="btn btn-primary" onClick={save}>
            Save Settings
          </button>
        }
      />
      <div className="card">
        <div className="form-grid">
          {[
            ["phone", "Phone"],
            ["email", "Email"],
            ["currency", "Currency"],
            ["language", "Language"],
            ["dateFormat", "Date Format"],
          ].map(([name, label]) => (
            <label key={name}>
              {label}
              <input
                value={form[name] || ""}
                onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))}
              />
            </label>
          ))}
          <label>
            Tax Rate (%)
            <input
              type="number"
              value={form.taxRate}
              onChange={(e) => setForm((p) => ({ ...p, taxRate: Number(e.target.value) }))}
            />
          </label>
          <label>
            Low Stock Threshold
            <input
              type="number"
              value={form.lowStockThreshold}
              onChange={(e) => setForm((p) => ({ ...p, lowStockThreshold: Number(e.target.value) }))}
            />
          </label>
          <label>
            Theme Default
            <select value={form.theme} onChange={(e) => setForm((p) => ({ ...p, theme: e.target.value }))}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Address
            <textarea
              rows={2}
              value={form.address || ""}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Receipt Footer
            <textarea
              rows={2}
              value={form.receiptFooter || ""}
              onChange={(e) => setForm((p) => ({ ...p, receiptFooter: e.target.value }))}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
