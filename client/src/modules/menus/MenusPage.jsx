import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";

function flattenTree(nodes, depth = 0, parentLabel = "") {
  const rows = [];
  (nodes || []).forEach((node) => {
    rows.push({
      ...node,
      _id: node.id || node._id,
      depth,
      parentLabel,
    });
    if (node.children?.length) {
      rows.push(...flattenTree(node.children, depth + 1, node.label));
    }
  });
  return rows;
}

const emptyForm = {
  name: "",
  label: "",
  icon: "Circle",
  url: "",
  parent: "",
  order: 0,
  permissionKey: "",
  isActive: true,
};

export default function MenusPage() {
  const toast = useToast();
  const { loadSession } = useAuth();
  const [flat, setFlat] = useState([]);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const rows = useMemo(() => flattenTree(tree), [tree]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api("/menus");
      setFlat(res.data.flat || []);
      setTree(res.data.tree || []);
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
      const body = {
        ...form,
        parent: form.parent || null,
        order: Number(form.order),
      };
      if (editing) {
        await api(`/menus/${editing._id}`, { method: "PUT", body });
        toast.success("Menu updated");
      } else {
        await api("/menus", { method: "POST", body });
        toast.success("Menu created");
      }
      setOpen(false);
      await load();
      await loadSession();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const move = async (item, dir) => {
    const siblings = flat
      .filter((m) => String(m.parent || "") === String(item.parent || ""))
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((m) => m._id === item._id);
    const swapWith = siblings[idx + dir];
    if (!swapWith) return;
    const items = [
      { id: item._id, order: swapWith.order, parent: item.parent || null },
      { id: swapWith._id, order: item.order, parent: swapWith.parent || null },
    ];
    await api("/menus/reorder", { method: "PUT", body: { items } });
    await load();
    await loadSession();
  };

  const remove = async (item) => {
    if (!window.confirm("Delete menu?")) return;
    try {
      await api(`/menus/${item._id}`, { method: "DELETE" });
      toast.success("Deleted");
      await load();
      await loadSession();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, order: flat.length + 1 });
    setOpen(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setForm({
      name: m.name,
      label: m.label,
      icon: m.icon,
      url: m.url || "",
      parent: m.parent || "",
      order: m.order,
      permissionKey: m.permissionKey || "",
      isActive: m.isActive,
    });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Menus"
        subtitle="Parent menus and submenu URLs for the sidebar"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Add Menu
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
                  <th>Parent</th>
                  <th>URL</th>
                  <th>Icon</th>
                  <th>Permission</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m._id}>
                    <td>{m.order}</td>
                    <td>
                      <span style={{ paddingLeft: `${m.depth * 18}px`, fontWeight: m.depth ? 500 : 700 }}>
                        {m.depth ? "↳ " : ""}
                        {m.label}
                      </span>
                    </td>
                    <td>{m.parentLabel || "—"}</td>
                    <td>{m.url || <span style={{ color: "var(--muted)" }}>group</span>}</td>
                    <td>{m.icon}</td>
                    <td>{m.permissionKey || "-"}</td>
                    <td>{m.isActive ? "Yes" : "No"}</td>
                    <td>
                      <button type="button" className="btn btn-ghost" onClick={() => move(m, -1)}>
                        ↑
                      </button>{" "}
                      <button type="button" className="btn btn-ghost" onClick={() => move(m, 1)}>
                        ↓
                      </button>{" "}
                      <button type="button" className="btn btn-ghost" onClick={() => openEdit(m)}>
                        Edit
                      </button>{" "}
                      <button type="button" className="btn btn-danger" onClick={() => remove(m)}>
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
        title={editing ? "Edit Menu" : "Add Menu"}
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
          {["name", "label", "icon", "url", "permissionKey"].map((name) => (
            <label key={name}>
              {name}
              <input
                value={form[name]}
                onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))}
                placeholder={name === "url" ? "/path or empty for parent group" : undefined}
              />
            </label>
          ))}
          <label>
            Order
            <input
              type="number"
              value={form.order}
              onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
            />
          </label>
          <label>
            Parent
            <select value={form.parent} onChange={(e) => setForm((p) => ({ ...p, parent: e.target.value }))}>
              <option value="">None (top level)</option>
              {flat
                .filter((m) => !editing || m._id !== editing._id)
                .filter((m) => !m.parent)
                .map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.label}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Active
            <select
              value={String(form.isActive)}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === "true" }))}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
        </div>
      </Modal>
    </div>
  );
}
