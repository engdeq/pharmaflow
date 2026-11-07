import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

const empty = {
  name: "",
  genericName: "",
  brand: "",
  category: "",
  sku: "",
  barcode: "",
  manufacturer: "",
  purchasePrice: 0,
  sellingPrice: 0,
  minStock: 10,
  unit: "pcs",
  supplier: "",
  description: "",
  batchNumber: "",
  batchQty: 0,
  expiryDate: "",
};

export default function MedicinesPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    try {
      const [meds, cats, sups] = await Promise.all([
        api(`/medicines?q=${encodeURIComponent(q)}`),
        api("/categories"),
        api("/suppliers"),
      ]);
      setItems(meds.data.items || []);
      setCategories(cats.data || []);
      setSuppliers(sups.data || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    try {
      const payload = {
        name: form.name,
        genericName: form.genericName,
        brand: form.brand,
        category: form.category || undefined,
        sku: form.sku,
        barcode: form.barcode,
        manufacturer: form.manufacturer,
        purchasePrice: Number(form.purchasePrice),
        sellingPrice: Number(form.sellingPrice),
        minStock: Number(form.minStock),
        unit: form.unit,
        supplier: form.supplier || undefined,
        description: form.description,
      };

      if (!editing && form.batchNumber && form.batchQty && form.expiryDate) {
        payload.initialBatch = {
          batchNumber: form.batchNumber,
          quantity: Number(form.batchQty),
          expiryDate: form.expiryDate,
          purchasePrice: Number(form.purchasePrice),
          sellingPrice: Number(form.sellingPrice),
        };
      }

      if (editing) {
        await api(`/medicines/${editing._id}`, { method: "PUT", body: payload });
        toast.success("Medicine updated");
      } else {
        await api("/medicines", { method: "POST", body: payload });
        toast.success("Medicine created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (item) => {
    if (!window.confirm("Delete medicine?")) return;
    try {
      await api(`/medicines/${item._id}`, { method: "DELETE" });
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Medicines"
        subtitle="Pharmacy store inventory catalog"
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setForm(empty);
              setOpen(true);
            }}
          >
            Add Medicine
          </button>
        }
      />

      <div className="toolbar">
        <input className="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, barcode, SKU" />
        <button type="button" className="btn btn-ghost" onClick={load}>
          Search
        </button>
      </div>

      <div className="card">
        {loading ? (
          <Skeleton />
        ) : items.length === 0 ? (
          <EmptyState title="No medicines yet" description="Add your first medicine to get started." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Sell Price</th>
                  <th>Min</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.name}</strong>
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>{item.genericName}</div>
                    </td>
                    <td>{item.category?.name || "-"}</td>
                    <td>
                      <span className={`badge ${item.availableQuantity <= item.minStock ? "badge-warning" : "badge-success"}`}>
                        {item.availableQuantity} {item.unit}
                      </span>
                    </td>
                    <td>${Number(item.sellingPrice).toFixed(2)}</td>
                    <td>{item.minStock}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                          setEditing(item);
                          setForm({
                            ...empty,
                            ...item,
                            category: item.category?._id || "",
                            supplier: item.supplier?._id || "",
                          });
                          setOpen(true);
                        }}
                      >
                        Edit
                      </button>{" "}
                      <button type="button" className="btn btn-danger" onClick={() => remove(item)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={open}
        title={editing ? "Edit Medicine" : "Add Medicine"}
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
          {[
            ["name", "Medicine Name"],
            ["genericName", "Generic Name"],
            ["brand", "Brand"],
            ["sku", "SKU"],
            ["barcode", "Barcode"],
            ["manufacturer", "Manufacturer"],
            ["unit", "Unit"],
          ].map(([name, label]) => (
            <label key={name}>
              {label}
              <input value={form[name]} onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))} />
            </label>
          ))}
          <label>
            Category
            <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
              <option value="">Select</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Supplier
            <select value={form.supplier} onChange={(e) => setForm((p) => ({ ...p, supplier: e.target.value }))}>
              <option value="">Select</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Purchase Price
            <input type="number" value={form.purchasePrice} onChange={(e) => setForm((p) => ({ ...p, purchasePrice: e.target.value }))} />
          </label>
          <label>
            Selling Price
            <input type="number" value={form.sellingPrice} onChange={(e) => setForm((p) => ({ ...p, sellingPrice: e.target.value }))} />
          </label>
          <label>
            Min Stock
            <input type="number" value={form.minStock} onChange={(e) => setForm((p) => ({ ...p, minStock: e.target.value }))} />
          </label>
          {!editing ? (
            <>
              <label>
                Initial Batch #
                <input value={form.batchNumber} onChange={(e) => setForm((p) => ({ ...p, batchNumber: e.target.value }))} />
              </label>
              <label>
                Initial Qty
                <input type="number" value={form.batchQty} onChange={(e) => setForm((p) => ({ ...p, batchQty: e.target.value }))} />
              </label>
              <label>
                Expiry Date
                <input type="date" value={form.expiryDate} onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))} />
              </label>
            </>
          ) : null}
          <label style={{ gridColumn: "1 / -1" }}>
            Description
            <textarea rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </label>
        </div>
      </Modal>
    </div>
  );
}
