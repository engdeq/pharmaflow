import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import StatusSwitch from "../../components/ui/StatusSwitch";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

const DEFAULT_BRANDING = {
  primaryColor: "#748CF8",
  secondaryColor: "#5A6FD8",
  sidebarColor: "#FFFFFF",
  sidebarActiveColor: "#748CF8",
  headerColor: "#FFFFFF",
  buttonColor: "#748CF8",
  backgroundColor: "#F5F7FB",
};

const COLOR_FIELDS = [
  ["primaryColor", "Primary Color"],
  ["secondaryColor", "Secondary Color"],
  ["sidebarColor", "Sidebar Color"],
  ["sidebarActiveColor", "Sidebar Active"],
  ["headerColor", "Header Color"],
  ["buttonColor", "Button Color"],
  ["backgroundColor", "Background Color"],
];

const emptyForm = {
  name: "",
  slug: "",
  logo: "",
  legalName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  country: "",
  plan: "trial",
  branding: { ...DEFAULT_BRANDING },
  ownerFullName: "",
  ownerUsername: "",
  ownerEmail: "",
  ownerPhone: "",
  ownerPassword: "",
};

export default function PlatformCompaniesPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [createdHint, setCreatedHint] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api("/platform/companies", { silent: true });
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
    setForm({ ...emptyForm, branding: { ...DEFAULT_BRANDING } });
    setCreatedHint(null);
    setOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setCreatedHint(null);
    setForm({
      ...emptyForm,
      name: c.name || "",
      slug: c.slug || "",
      logo: c.logo || c.branding?.logo || "",
      legalName: c.legalName || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      city: c.city || "",
      country: c.country || "",
      plan: c.subscription?.plan || "trial",
      branding: { ...DEFAULT_BRANDING, ...(c.branding || {}) },
    });
    setOpen(true);
  };

  const setBrand = (key, value) => {
    setForm((p) => ({ ...p, branding: { ...p.branding, [key]: value } }));
  };

  const save = async () => {
    try {
      const brandingPayload = {
        pharmacyName: form.name,
        logo: form.logo,
        ...form.branding,
      };
      if (editing) {
        await api(`/platform/companies/${editing._id}`, {
          method: "PUT",
          body: {
            name: form.name,
            slug: form.slug,
            logo: form.logo,
            legalName: form.legalName,
            phone: form.phone,
            email: form.email,
            address: form.address,
            city: form.city,
            country: form.country,
            plan: form.plan,
            branding: brandingPayload,
          },
          successMessage: "Company updated",
        });
        setOpen(false);
      } else {
        const res = await api("/platform/companies", {
          method: "POST",
          body: {
            ...form,
            logo: form.logo,
            branding: brandingPayload,
          },
          successMessage: "Pharmacy registered",
        });
        setCreatedHint(res.data?.loginHint || null);
        if (!res.data?.loginHint) setOpen(false);
      }
      load();
      if (editing) setOpen(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const setStatus = async (company, status) => {
    try {
      await api(`/platform/companies/${company._id}/status`, {
        method: "PUT",
        body: { status },
        successMessage: `Company ${status}`,
      });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="Diiwaangeli pharmacy, fur/xir, magac, subscription — milkiiluhu wuxuu login ku geli karaa code-kiisa"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Register Pharmacy
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
                  <th>Pharmacy</th>
                  <th>Code / Slug</th>
                  <th>Owner</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <strong>{c.name}</strong>
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>{c.email}</div>
                    </td>
                    <td>
                      <code>{c.slug || "-"}</code>
                    </td>
                    <td>
                      {c.ownerUserId?.username || "-"}
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>{c.ownerUserId?.email}</div>
                    </td>
                    <td>{c.subscription?.plan || "-"}</td>
                    <td>
                      <span className={`badge badge-${c.status === "active" ? "success" : "warning"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <StatusSwitch
                        checked={c.status === "active"}
                        onChange={(on) => setStatus(c, on ? "active" : "suspended")}
                      />
                    </td>
                    <td>
                      <button type="button" className="btn btn-ghost" onClick={() => openEdit(c)}>
                        Edit
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
        title={editing ? "Edit Pharmacy" : "Register Pharmacy"}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              {createdHint ? "Close" : "Cancel"}
            </button>
            {!createdHint ? (
              <button type="button" className="btn btn-primary" onClick={save}>
                Save
              </button>
            ) : null}
          </>
        }
      >
        {createdHint ? (
          <div className="step-box" style={{ display: "grid", gap: 8 }}>
            <strong>Pharmacy ready — give these to the owner:</strong>
            <div>
              Pharmacy Code: <code>{createdHint.companySlug}</code>
            </div>
            <div>
              Username: <code>{createdHint.username}</code>
            </div>
            <p style={{ color: "var(--muted)", margin: 0 }}>
              Login page: geli Pharmacy Code + Username + Password. Ka dib owner-ku wuxuu Users ka sameyn karaa.
            </p>
          </div>
        ) : (
          <div className="form-grid">
            <label>
              Pharmacy Name
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </label>
            <label>
              Pharmacy Code (slug / subdomain)
              <input
                value={form.slug}
                placeholder="e.g. deq-pharma"
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase() }))}
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Logo URL
              <input
                value={form.logo || ""}
                placeholder="https://..."
                onChange={(e) => setForm((p) => ({ ...p, logo: e.target.value }))}
              />
            </label>
            <label>
              Legal Name
              <input value={form.legalName} onChange={(e) => setForm((p) => ({ ...p, legalName: e.target.value }))} />
            </label>
            <label>
              Email
              <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </label>
            <label>
              Phone
              <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </label>
            <label>
              City
              <input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
            </label>
            <label>
              Country
              <input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
            </label>
            <label>
              Address
              <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </label>
            <label>
              Subscription Plan
              <select value={form.plan} onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}>
                <option value="trial">Trial</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>

            <div style={{ gridColumn: "1 / -1", fontWeight: 700, marginTop: 8 }}>
              Color Template
            </div>
            {COLOR_FIELDS.map(([key, label]) => (
              <label key={key}>
                {label}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="color"
                    value={form.branding[key] || "#748CF8"}
                    onChange={(e) => setBrand(key, e.target.value)}
                  />
                  <input value={form.branding[key] || ""} onChange={(e) => setBrand(key, e.target.value)} />
                </div>
              </label>
            ))}

            {!editing ? (
              <>
                <div style={{ gridColumn: "1 / -1", fontWeight: 700, marginTop: 8 }}>Owner Admin Account</div>
                <label>
                  Owner Full Name
                  <input
                    value={form.ownerFullName}
                    onChange={(e) => setForm((p) => ({ ...p, ownerFullName: e.target.value }))}
                  />
                </label>
                <label>
                  Owner Username
                  <input
                    value={form.ownerUsername}
                    onChange={(e) => setForm((p) => ({ ...p, ownerUsername: e.target.value }))}
                  />
                </label>
                <label>
                  Owner Email
                  <input
                    value={form.ownerEmail}
                    onChange={(e) => setForm((p) => ({ ...p, ownerEmail: e.target.value }))}
                  />
                </label>
                <label>
                  Owner Phone
                  <input
                    value={form.ownerPhone}
                    onChange={(e) => setForm((p) => ({ ...p, ownerPhone: e.target.value }))}
                  />
                </label>
                <label>
                  Owner Password
                  <input
                    type="password"
                    value={form.ownerPassword}
                    onChange={(e) => setForm((p) => ({ ...p, ownerPassword: e.target.value }))}
                  />
                </label>
              </>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  );
}
