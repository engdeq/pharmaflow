import { useEffect, useMemo, useState } from "react";
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
  const [tab, setTab] = useState("company"); // company | catalog
  const [catalog, setCatalog] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const [filterName, setFilterName] = useState("");
  const [filterPhone, setFilterPhone] = useState("");
  const [filterCode, setFilterCode] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [companyMenus, setCompanyMenus] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [menusLoading, setMenusLoading] = useState(false);

  const loadBase = async () => {
    setLoading(true);
    try {
      const [menusRes, companiesRes] = await Promise.all([
        api("/platform/global-menus", { silent: true }),
        api("/platform/companies", { silent: true }),
      ]);
      setCatalog(menusRes.data || []);
      setCompanies(companiesRes.data || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBase();
  }, []);

  const filteredCompanies = useMemo(() => {
    const name = filterName.trim().toLowerCase();
    const phone = filterPhone.trim().toLowerCase();
    const code = filterCode.trim().toLowerCase();
    return (companies || []).filter((c) => {
      if (name && !(c.name || "").toLowerCase().includes(name) && !(c.legalName || "").toLowerCase().includes(name)) {
        return false;
      }
      if (phone && !(c.phone || "").toLowerCase().includes(phone)) return false;
      if (code && !(c.slug || "").toLowerCase().includes(code)) return false;
      return true;
    });
  }, [companies, filterName, filterPhone, filterCode]);

  const loadCompanyMenus = async (companyId) => {
    if (!companyId) {
      setCompanyMenus([]);
      setSelectedCompany(null);
      return;
    }
    setMenusLoading(true);
    try {
      const res = await api(`/platform/companies/${companyId}/menus`, { silent: true });
      setSelectedCompany(res.data?.company || null);
      setCompanyMenus(res.data?.menus || []);
    } catch (err) {
      toast.error(err.message);
      setCompanyMenus([]);
    } finally {
      setMenusLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "company" && selectedId) loadCompanyMenus(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, tab]);

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

  const saveCatalog = async () => {
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
      loadBase();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleCatalog = async (m, on) => {
    try {
      await api(`/platform/global-menus/${m._id}`, {
        method: "PUT",
        body: { isActive: on },
        silent: true,
      });
      loadBase();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeCatalog = async (m) => {
    if (!confirm(`Delete global menu "${m.label}"?`)) return;
    try {
      await api(`/platform/global-menus/${m._id}`, {
        method: "DELETE",
        successMessage: "Menu deleted",
      });
      loadBase();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleCompanyMenu = async (m, on) => {
    if (!selectedId) return;
    try {
      await api(`/platform/companies/${selectedId}/menus/${m._id}`, {
        method: "PUT",
        body: { isActive: on },
        successMessage: on ? "Menu enabled" : "Menu disabled",
      });
      loadCompanyMenus(selectedId);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resyncCompany = async () => {
    if (!selectedId) return;
    if (!confirm("Resync this pharmacy menus from platform template? Current order may reset.")) return;
    try {
      await api(`/platform/companies/${selectedId}/menus/resync`, {
        method: "POST",
        successMessage: "Menus resynced",
      });
      loadCompanyMenus(selectedId);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Skeleton />;

  return (
    <div>
      <PageHeader
        title="Global Menu Management"
        subtitle="Doorso pharmacy (magac / phone / code) — menu kasta gooni ahaan fur/xid"
        actions={
          tab === "catalog" ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              Add Global Menu
            </button>
          ) : selectedId ? (
            <button type="button" className="btn btn-ghost" onClick={resyncCompany}>
              Resync Template
            </button>
          ) : null
        }
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          className={`btn ${tab === "company" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("company")}
        >
          Per Company Menus
        </button>
        <button
          type="button"
          className={`btn ${tab === "catalog" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("catalog")}
        >
          Global Catalog
        </button>
      </div>

      {tab === "company" ? (
        <>
          <div className="card" style={{ padding: 16, marginBottom: 14 }}>
            <div className="form-grid">
              <label>
                Filter by Name
                <input
                  value={filterName}
                  placeholder="e.g. Shafi"
                  onChange={(e) => setFilterName(e.target.value)}
                />
              </label>
              <label>
                Filter by Phone
                <input
                  value={filterPhone}
                  placeholder="e.g. 61..."
                  onChange={(e) => setFilterPhone(e.target.value)}
                />
              </label>
              <label>
                Filter by Code
                <input
                  value={filterCode}
                  placeholder="e.g. shafi-pharma"
                  onChange={(e) => setFilterCode(e.target.value)}
                />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Select Pharmacy
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  <option value="">— dooro pharmacy —</option>
                  {filteredCompanies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} · {c.slug} · {c.phone || "no-phone"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {selectedCompany ? (
              <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13 }}>
                Selected: <strong style={{ color: "#17243B" }}>{selectedCompany.name}</strong> (
                {selectedCompany.slug}) · {selectedCompany.phone || "-"} · {selectedCompany.status}
              </div>
            ) : (
              <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13 }}>
                Filter + dooro pharmacy si aad menu-yadeeda gooni ugu furto/xidho.
              </div>
            )}
          </div>

          <div className="card">
            {!selectedId ? (
              <div style={{ padding: 20, color: "var(--muted)" }}>Door pharmacy si aad menus u maamusho.</div>
            ) : menusLoading ? (
              <Skeleton />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Menu</th>
                      <th>URL</th>
                      <th>Parent</th>
                      <th>Module</th>
                      <th>Enabled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyMenus.map((m) => (
                      <tr key={m._id} style={{ opacity: m.isActive === false ? 0.55 : 1 }}>
                        <td>{m.order}</td>
                        <td>
                          <strong>{m.label}</strong>
                          <div style={{ color: "var(--muted)", fontSize: 12 }}>
                            {m.icon} · {m.name}
                          </div>
                        </td>
                        <td>
                          <code>{m.url || "-"}</code>
                        </td>
                        <td>{m.parentName || "-"}</td>
                        <td>{m.moduleKey || "-"}</td>
                        <td>
                          <StatusSwitch
                            checked={m.isActive !== false}
                            onChange={(on) => toggleCompanyMenu(m, on)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card">
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
                {catalog.map((m) => (
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
                      <StatusSwitch checked={m.isActive !== false} onChange={(on) => toggleCatalog(m, on)} />
                    </td>
                    <td>
                      <button type="button" className="btn btn-ghost" onClick={() => openEdit(m)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => removeCatalog(m)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={open}
        title={editing ? "Edit Global Menu" : "Add Global Menu"}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveCatalog}>
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
