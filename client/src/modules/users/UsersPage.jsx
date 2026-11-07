import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import StatusSwitch from "../../components/ui/StatusSwitch";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

const emptyForm = {
  username: "",
  email: "",
  password: "",
  fullName: "",
  phone: "",
  roles: [],
  status: "active",
};

export default function UsersPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const [users, roleRes] = await Promise.all([api("/users?limit=100"), api("/roles")]);
      setItems(users.data.items || []);
      setRoles(roleRes.data || []);
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
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (user) => {
    if (user.isProtected) {
      toast.error("Protected developer account cannot be edited");
      return;
    }
    setEditing(user);
    setForm({
      username: user.username || "",
      email: user.email || "",
      password: "",
      fullName: user.fullName || "",
      phone: user.phone || "",
      roles: (user.roles || []).map((r) => r._id || r),
      status: user.status || "active",
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        const body = {
          username: form.username,
          email: form.email,
          fullName: form.fullName,
          phone: form.phone,
          roles: form.roles,
          status: form.status,
        };
        await api(`/users/${editing._id}`, { method: "PUT", body });
        toast.success("User updated");
      } else {
        await api("/users", { method: "POST", body: form });
        toast.success("User created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleStatus = async (user, nextActive) => {
    if (user.isProtected) {
      toast.error("Protected developer account cannot be deactivated");
      return;
    }
    try {
      await api(`/users/${user._id}`, {
        method: "PUT",
        body: { status: nextActive ? "active" : "inactive" },
      });
      toast.success(nextActive ? "User activated" : "User deactivated");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resetPassword = async (user) => {
    if (user.isProtected) {
      toast.error("Protected developer account cannot be reset");
      return;
    }
    try {
      await api(`/users/${user._id}/reset-password`, {
        method: "POST",
        body: { password: "ChangeMe@123" },
      });
      toast.success("Password reset to ChangeMe@123");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (user) => {
    if (user.isProtected) {
      toast.error("Protected developer account cannot be deleted");
      return;
    }
    if (!window.confirm(`Delete user ${user.username}?`)) return;
    try {
      await api(`/users/${user._id}`, { method: "DELETE" });
      toast.success("User deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="User accounts, edit, and active status"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Add User
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
                  <th>Username</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <strong>{u.username}</strong>
                      {u.isProtected ? (
                        <div style={{ color: "var(--primary)", fontSize: 11, fontWeight: 700 }}>
                          System Developer · Locked
                        </div>
                      ) : null}
                      {u.fullName ? (
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>{u.fullName}</div>
                      ) : null}
                    </td>
                    <td>{u.email}</td>
                    <td>{(u.roles || []).map((r) => r.name).join(", ") || "-"}</td>
                    <td>
                      <StatusSwitch
                        checked={u.status === "active"}
                        disabled={u.isProtected}
                        onChange={(on) => toggleStatus(u, on)}
                      />
                    </td>
                    <td>{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "-"}</td>
                    <td>
                      {u.isProtected ? (
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>Protected</span>
                      ) : (
                        <>
                          <button type="button" className="btn btn-ghost" onClick={() => openEdit(u)}>
                            Edit
                          </button>{" "}
                          <button type="button" className="btn btn-ghost" onClick={() => resetPassword(u)}>
                            Reset PW
                          </button>{" "}
                          <button type="button" className="btn btn-danger" onClick={() => remove(u)}>
                            Delete
                          </button>
                        </>
                      )}
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
        title={editing ? "Edit User" : "Add User"}
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
          {["username", "email", "fullName", "phone"].map((name) => (
            <label key={name}>
              {name}
              <input
                type="text"
                value={form[name]}
                onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))}
              />
            </label>
          ))}
          {!editing ? (
            <label>
              password
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
            </label>
          ) : null}
          <label>
            Status
            <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Roles
            <select
              multiple
              value={form.roles}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  roles: [...e.target.selectedOptions].map((o) => o.value),
                }))
              }
              style={{ minHeight: 100 }}
            >
              {roles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Modal>
    </div>
  );
}
