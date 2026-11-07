import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function CrudPage({
  title,
  subtitle,
  endpoint,
  columns,
  fields,
  mapItem,
  createPermission = true,
}) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await api(`${endpoint}${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      const data = res.data?.items || res.data || [];
      setItems(Array.isArray(data) ? data : []);
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
    setForm(Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? ""])));
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    const next = {};
    fields.forEach((f) => {
      next[f.name] = item[f.name] ?? "";
    });
    setForm(next);
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api(`${endpoint}/${editing._id}`, { method: "PUT", body: form });
        toast.success("Updated successfully");
      } else {
        await api(endpoint, { method: "POST", body: form });
        toast.success("Created successfully");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (item) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await api(`${endpoint}/${item._id}`, { method: "DELETE" });
      toast.success("Deleted");
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
          createPermission ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              Add New
            </button>
          ) : null
        }
      />

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="btn btn-ghost" onClick={load}>
          Search
        </button>
      </div>

      <div className="card">
        {loading ? (
          <Skeleton />
        ) : items.length === 0 ? (
          <EmptyState title={`No ${title.toLowerCase()} found`} />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const row = mapItem ? mapItem(item) : item;
                  return (
                    <tr key={item._id}>
                      {columns.map((c) => (
                        <td key={c.key}>{row[c.key]}</td>
                      ))}
                      <td>
                        <button type="button" className="btn btn-ghost" onClick={() => openEdit(item)}>
                          Edit
                        </button>{" "}
                        <button type="button" className="btn btn-danger" onClick={() => remove(item)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={open}
        title={editing ? `Edit ${title}` : `Add ${title}`}
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
          {fields.map((field) => (
            <label key={field.name} style={field.full ? { gridColumn: "1 / -1" } : undefined}>
              {field.label}
              {field.type === "textarea" ? (
                <textarea
                  rows={3}
                  value={form[field.name] || ""}
                  onChange={(e) => setForm((p) => ({ ...p, [field.name]: e.target.value }))}
                />
              ) : field.type === "select" ? (
                <select
                  value={form[field.name] || ""}
                  onChange={(e) => setForm((p) => ({ ...p, [field.name]: e.target.value }))}
                >
                  <option value="">Select</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || "text"}
                  value={form[field.name] ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      [field.name]:
                        field.type === "number" ? Number(e.target.value) : e.target.value,
                    }))
                  }
                />
              )}
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
