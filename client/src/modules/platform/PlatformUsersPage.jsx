import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import StatusSwitch from "../../components/ui/StatusSwitch";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

const empty = {
  fullName: "",
  username: "",
  email: "",
  phone: "",
  password: "",
};

export default function PlatformUsersPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api("/platform/users", { silent: true });
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

  const save = async () => {
    try {
      await api("/platform/users", {
        method: "POST",
        body: form,
        successMessage: "Platform user created",
      });
      setOpen(false);
      setForm(empty);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const setActive = async (user, on) => {
    try {
      await api(`/platform/users/${user._id}`, {
        method: "PUT",
        body: { status: on ? "active" : "inactive" },
        successMessage: on ? "User activated" : "User deactivated",
      });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Platform Users"
        subtitle="MedAxis Control Center staff — separate from pharmacy users"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            Add Platform User
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
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Protected</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <strong>{u.fullName || "-"}</strong>
                    </td>
                    <td>
                      <code>{u.username}</code>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.isProtected ? "Yes" : "No"}</td>
                    <td>
                      <StatusSwitch
                        checked={u.status === "active"}
                        disabled={u.isProtected}
                        onChange={(on) => setActive(u, on)}
                      />
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
        title="Add Platform User"
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
          <label>
            Full Name
            <input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
          </label>
          <label>
            Username
            <input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
          </label>
          <label>
            Email
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
