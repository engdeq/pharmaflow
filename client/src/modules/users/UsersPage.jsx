import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function UsersPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    phone: "",
    roles: [],
    status: "active",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [users, roleRes] = await Promise.all([api("/users"), api("/roles")]);
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

  const save = async () => {
    try {
      await api("/users", { method: "POST", body: form });
      toast.success("User created");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleStatus = async (user) => {
    try {
      await api(`/users/${user._id}`, {
        method: "PUT",
        body: { status: user.status === "active" ? "inactive" : "active" },
      });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resetPassword = async (user) => {
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

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="User accounts and role assignment"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
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
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{(u.roles || []).map((r) => r.name).join(", ")}</td>
                    <td>
                      <span className={`badge badge-${u.status === "active" ? "success" : "danger"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "-"}</td>
                    <td>
                      <button type="button" className="btn btn-ghost" onClick={() => toggleStatus(u)}>
                        Toggle
                      </button>{" "}
                      <button type="button" className="btn btn-ghost" onClick={() => resetPassword(u)}>
                        Reset PW
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
        title="Add User"
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
          {["username", "email", "password", "fullName", "phone"].map((name) => (
            <label key={name}>
              {name}
              <input
                type={name === "password" ? "password" : "text"}
                value={form[name]}
                onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))}
              />
            </label>
          ))}
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
