import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function InventoryPage() {
  const toast = useToast();
  const [batches, setBatches] = useState([]);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    medicineId: "",
    batchNumber: "",
    quantity: 0,
    expiryDate: "",
    notes: "",
  });
  const [medicines, setMedicines] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [inv, history, meds] = await Promise.all([
        api("/inventory"),
        api("/inventory/transactions"),
        api("/medicines?limit=100"),
      ]);
      setBatches(inv.data || []);
      setTxs(history.data || []);
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

  const adjust = async () => {
    try {
      await api("/inventory/adjust", { method: "POST", body: form });
      toast.success("Stock adjusted");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Stock levels and movement history"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            Adjust Stock
          </button>
        }
      />

      {loading ? (
        <Skeleton />
      ) : (
        <div className="two-col">
          <div className="card">
            <h3>Current Batches</h3>
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
                  {batches.map((b) => (
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
          </div>
          <div className="card">
            <h3>Stock History</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t) => (
                    <tr key={t._id}>
                      <td>{t.medicine?.name}</td>
                      <td>{t.type}</td>
                      <td>{t.quantity}</td>
                      <td>{t.performedBy?.username || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={open}
        title="Stock Adjustment"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={adjust}>
              Save
            </button>
          </>
        }
      >
        <div className="form-grid">
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
            Batch Number
            <input value={form.batchNumber} onChange={(e) => setForm((p) => ({ ...p, batchNumber: e.target.value }))} />
          </label>
          <label>
            Quantity (+ in / - out)
            <input type="number" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))} />
          </label>
          <label>
            Expiry (for new batch)
            <input type="date" value={form.expiryDate} onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))} />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Notes
            <input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </label>
        </div>
      </Modal>
    </div>
  );
}
