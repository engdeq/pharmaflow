import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function RolesPage() {
  const toast = useToast();
  const [roles, setRoles] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [roleRes, permRes] = await Promise.all([api("/roles"), api("/permissions")]);
      setRoles(roleRes.data || []);
      setGrouped(permRes.data.grouped || {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (role) => {
    setEditing(role);
    setName(role.name);
    setDescription(role.description || "");
    setSelected((role.permissions || []).map((p) => p._id || p));
    setOpen(true);
  };

  const togglePerm = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectModule = (moduleKeys, on) => {
    setSelected((prev) => {
      const set = new Set(prev);
      moduleKeys.forEach((id) => (on ? set.add(id) : set.delete(id)));
      return [...set];
    });
  };

  const save = async () => {
    try {
      const body = { name, description, permissions: selected };
      if (editing) {
        await api(`/roles/${editing._id}`, { method: "PUT", body });
        toast.success("Role updated");
      } else {
        await api("/roles", { method: "POST", body });
        toast.success("Role created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Roles"
        subtitle="Role-based access control"
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setName("");
              setDescription("");
              setSelected([]);
              setOpen(true);
            }}
          >
            Add Role
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
                  <th>Role</th>
                  <th>Users</th>
                  <th>Permissions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <strong>{r.name}</strong>
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>{r.description}</div>
                    </td>
                    <td>{r.usersCount}</td>
                    <td>{r.permissions?.length || 0}</td>
                    <td>{r.isActive ? "Active" : "Inactive"}</td>
                    <td>
                      <button type="button" className="btn btn-ghost" onClick={() => openEdit(r)}>
                        Edit Permissions
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
        title={editing ? `Edit ${editing.name}` : "Create Role"}
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
        <div className="stack-form" style={{ display: "grid", gap: 12 }}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={editing?.isSystem} />
          </label>
          <label>
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div>
            <h4>Permission Matrix</h4>
            {Object.entries(grouped).map(([module, perms]) => (
              <div key={module} style={{ marginBottom: 12, border: "1px solid var(--border)", borderRadius: 12, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <strong style={{ textTransform: "capitalize" }}>{module}</strong>
                  <div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => selectModule(perms.map((p) => p._id), true)}
                    >
                      All
                    </button>{" "}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => selectModule(perms.map((p) => p._id), false)}
                    >
                      None
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {perms.map((p) => (
                    <label key={p._id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={selected.includes(p._id)}
                        onChange={() => togglePerm(p._id)}
                      />
                      {p.action}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
