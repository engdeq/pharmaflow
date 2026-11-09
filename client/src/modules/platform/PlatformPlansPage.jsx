import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import StatusSwitch from "../../components/ui/StatusSwitch";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

const empty = {
  code: "",
  name: "",
  description: "",
  priceMonthly: 0,
  priceYearly: 0,
  currency: "USD",
  userLimit: 10,
  branchLimit: 1,
  trialDays: 0,
  features: "",
  isActive: true,
  sortOrder: 0,
};

export default function PlatformPlansPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api("/platform/plans", { silent: true });
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

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      code: p.code,
      name: p.name,
      description: p.description || "",
      priceMonthly: p.priceMonthly || 0,
      priceYearly: p.priceYearly || 0,
      currency: p.currency || "USD",
      userLimit: p.userLimit || 10,
      branchLimit: p.branchLimit || 1,
      trialDays: p.trialDays || 0,
      features: (p.features || []).join(", "),
      isActive: p.isActive !== false,
      sortOrder: p.sortOrder || 0,
    });
    setOpen(true);
  };

  const save = async () => {
    const body = {
      ...form,
      features: String(form.features || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      if (editing) {
        await api(`/platform/plans/${editing._id}`, {
          method: "PUT",
          body,
          successMessage: "Plan updated",
        });
      } else {
        await api("/platform/plans", {
          method: "POST",
          body,
          successMessage: "Plan created",
        });
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggle = async (p, on) => {
    try {
      await api(`/platform/plans/${p._id}`, {
        method: "PUT",
        body: { isActive: on },
        silent: true,
      });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Subscription Plans"
        subtitle="Define Trial / Starter / Professional / Enterprise pricing and limits"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Add Plan
          </button>
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
        {loading ? (
          <Skeleton />
        ) : (
          items.map((p) => (
            <div key={p._id} className="card" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <div style={{ color: "var(--muted)", fontSize: 12, textTransform: "uppercase" }}>{p.code}</div>
                  <h3 style={{ margin: "4px 0 8px" }}>{p.name}</h3>
                </div>
                <StatusSwitch checked={p.isActive !== false} onChange={(on) => toggle(p, on)} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#315FF4" }}>
                ${p.priceMonthly}
                <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>/mo</span>
              </div>
              <p style={{ color: "var(--muted)", minHeight: 40 }}>{p.description || "—"}</p>
              <ul style={{ margin: "0 0 14px", paddingLeft: 18, color: "#17243B", fontSize: 13 }}>
                <li>{p.userLimit} users</li>
                <li>{p.branchLimit} branches</li>
                {(p.features || []).slice(0, 3).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button type="button" className="btn btn-ghost" onClick={() => openEdit(p)}>
                Edit Plan
              </button>
            </div>
          ))
        )}
      </div>

      <Modal
        open={open}
        title={editing ? "Edit Plan" : "Add Plan"}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save}>
              Save
            </button>
          </>
        }
      >
        <div className="form-grid">
          {!editing ? (
            <label>
              Code
              <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
            </label>
          ) : null}
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </label>
          <label>
            Monthly Price
            <input
              type="number"
              value={form.priceMonthly}
              onChange={(e) => setForm((p) => ({ ...p, priceMonthly: Number(e.target.value) }))}
            />
          </label>
          <label>
            Yearly Price
            <input
              type="number"
              value={form.priceYearly}
              onChange={(e) => setForm((p) => ({ ...p, priceYearly: Number(e.target.value) }))}
            />
          </label>
          <label>
            User Limit
            <input
              type="number"
              value={form.userLimit}
              onChange={(e) => setForm((p) => ({ ...p, userLimit: Number(e.target.value) }))}
            />
          </label>
          <label>
            Branch Limit
            <input
              type="number"
              value={form.branchLimit}
              onChange={(e) => setForm((p) => ({ ...p, branchLimit: Number(e.target.value) }))}
            />
          </label>
          <label>
            Trial Days
            <input
              type="number"
              value={form.trialDays}
              onChange={(e) => setForm((p) => ({ ...p, trialDays: Number(e.target.value) }))}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Description
            <input
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Features (comma separated)
            <input value={form.features} onChange={(e) => setForm((p) => ({ ...p, features: e.target.value }))} />
          </label>
        </div>
      </Modal>
    </div>
  );
}
