import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

function viewFromPath(pathname) {
  if (pathname.endsWith("/create")) return "create";
  if (pathname.endsWith("/incoming")) return "incoming";
  return "pending";
}

export default function PurchasesPage() {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const view = viewFromPath(location.pathname);

  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    supplierId: "",
    medicineId: "",
    quantity: 1,
    purchasePrice: 0,
    batchNumber: "",
    expiryDate: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [purchases, sups, meds] = await Promise.all([
        api("/purchases"),
        api("/suppliers"),
        api("/medicines?limit=100"),
      ]);
      setItems(purchases.data || []);
      setSuppliers(sups.data || []);
      setMedicines(meds.data.items || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (view === "create") setOpen(true);
    else setOpen(false);
  }, [view]);

  const filtered = useMemo(() => {
    if (view === "incoming") {
      return items.filter((p) => p.status === "approved" || p.status === "received");
    }
    return items.filter((p) => p.status !== "approved" && p.status !== "received");
  }, [items, view]);

  const title =
    view === "create" ? "Create Purchase" : view === "incoming" ? "Incoming Purchases" : "Pending Purchases";
  const subtitle =
    view === "create"
      ? "Add a new supplier purchase order"
      : view === "incoming"
        ? "Approved purchases awaiting or completed intake"
        : "Purchases waiting for approval";

  const create = async () => {
    try {
      const med = medicines.find((m) => m._id === form.medicineId);
      await api("/purchases", {
        method: "POST",
        body: {
          supplierId: form.supplierId,
          items: [
            {
              medicineId: form.medicineId,
              name: med?.name,
              quantity: Number(form.quantity),
              purchasePrice: Number(form.purchasePrice),
              batchNumber: form.batchNumber,
              expiryDate: form.expiryDate,
            },
          ],
        },
      });
      toast.success("Purchase created");
      setOpen(false);
      navigate("/purchases");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const approve = async (id) => {
    try {
      await api(`/purchases/${id}/approve`, { method: "POST" });
      toast.success("Purchase approved");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          view !== "create" ? (
            <button type="button" className="btn btn-primary" onClick={() => navigate("/purchases/create")}>
              New Purchase
            </button>
          ) : null
        }
      />
      <div className="card">
        {loading ? (
          <Skeleton />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Supplier</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ color: "var(--muted)" }}>
                      No purchases in this view.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p._id}>
                      <td>{p.purchaseNumber}</td>
                      <td>{p.supplier?.name}</td>
                      <td>${Number(p.totalCost).toFixed(2)}</td>
                      <td>
                        <span className={`badge badge-${p.status === "approved" ? "success" : "warning"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        {p.status !== "approved" && p.status !== "received" ? (
                          <button type="button" className="btn btn-primary" onClick={() => approve(p._id)}>
                            Approve
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={open}
        title="New Purchase"
        onClose={() => {
          setOpen(false);
          if (view === "create") navigate("/purchases");
        }}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setOpen(false);
                if (view === "create") navigate("/purchases");
              }}
            >
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={create}>
              Create
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label>
            Supplier
            <select value={form.supplierId} onChange={(e) => setForm((p) => ({ ...p, supplierId: e.target.value }))}>
              <option value="">Select</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Medicine
            <select value={form.medicineId} onChange={(e) => setForm((p) => ({ ...p, medicineId: e.target.value }))}>
              <option value="">Select</option>
              {medicines.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
            />
          </label>
          <label>
            Purchase Price
            <input
              type="number"
              value={form.purchasePrice}
              onChange={(e) => setForm((p) => ({ ...p, purchasePrice: e.target.value }))}
            />
          </label>
          <label>
            Batch Number
            <input value={form.batchNumber} onChange={(e) => setForm((p) => ({ ...p, batchNumber: e.target.value }))} />
          </label>
          <label>
            Expiry Date
            <input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
