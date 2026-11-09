import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import StatusSwitch from "../../components/ui/StatusSwitch";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

const empty = {
  name: "",
  label: "",
  icon: "Circle",
  url: "",
  parentName: "",
  order: 0,
  section: "operations",
  moduleKey: "",
  permissionKey: "",
  isActive: true,
};

export default function PlatformGlobalMenusPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api("/platform/global-menus", { silent: true });
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

  const openEdit = (m) => {
    setEditing(m);
    setForm({
      name: m.name,
      label: m.label,
      icon: m.icon || "Circle",
      url: m.url || "",
      parentName: m.parentName || "",
      order: m.order || 0,
      section: m.section || "operations",
      moduleKey: m.moduleKey || "",
      permissionKey: m.permissionKey || "",
      isActive: m.isActive !== false,
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api(`/platform/global-menus/${editing._id}`, {
          method: "PUT",
          body: form,
          successMessage: "Menu updated",
        });
      } else {
        await api("/platform/global-menus", {
          method: "POST",
          body: form,
          successMessage: "Menu created",
        });
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggle = async (m, on) => {
    try {
      await api(`/platform/global-menus/${m._id}`, {
        method: "PUT",
        body: { isActive: on },
        silent: true,
      });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (m) => {
    if (!confirm(`Delete global menu "${m.label}"?`)) return;
    try {
      await api(`/platform/global-menus/${m._id}`, {
        method: "DELETE",
        successMessage: "Menu deleted",
      });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Global Menu Management"
        subtitle="Central menu catalog — pharmacies derive menus from this list"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Add Global Menu
          </button>
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
                  <th>Order</th>
                  <th>Label</th>
                  <th>Section</th>
                  <th>URL</th>
                  <th>Module</th>
                  <th>Parent</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m._id}>
                    <td>{m.order}</td>
                    <td>
                      <strong>{m.label}</strong>
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>
                        {m.icon} · {m.name}
                      </div>
                    </td>
                    <td>{m.section}</td>
                    <td>
                      <code>{m.url || "-"}</code>
                    </td>
                    <td>{m.moduleKey || "-"}</td>
                    <td>{m.parentName || "-"}</td>
                    <td>
                      <StatusSwitch checked={m.isActive !== false} onChange={(on) => toggle(m, on)} />
                    </td>
                    <td>
                      <button type="button" className="btn btn-ghost" onClick={() => openEdit(m)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => remove(m)}>
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
        title={editing ? "Edit Global Menu" : "Add Global Menu"}
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
              Name (key)
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </label>
          ) : null}
          <label>
            Label
            <input value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} />
          </label>
          <label>
            Icon
            <input value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} />
          </label>
          <label>
            URL
            <input value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} />
          </label>
          <label>
            Parent Name
            <input
              value={form.parentName}
              placeholder="e.g. pos_group"
              onChange={(e) => setForm((p) => ({ ...p, parentName: e.target.value }))}
            />
          </label>
          <label>
            Section
            <select value={form.section} onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))}>
              <option value="operations">Operations</option>
              <option value="administration">Administration</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Order
            <input
              type="number"
              value={form.order}
              onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))}
            />
          </label>
          <label>
            Module Key
            <input value={form.moduleKey} onChange={(e) => setForm((p) => ({ ...p, moduleKey: e.target.value }))} />
          </label>
          <label>
            Permission Key
            <input
              value={form.permissionKey}
              onChange={(e) => setForm((p) => ({ ...p, permissionKey: e.target.value }))}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
