import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Modal from "../../components/ui/Modal";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { pharmacyLiveUrl, pharmacySubdomainUrl } from "../../utils/tenantHost";

const BASE = "medaxis.dirshay.com";

export default function PlatformDomainsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    companyId: "",
    slug: "",
    type: "subdomain",
    hostname: "",
    isPrimary: true,
    status: "pending",
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([
        api("/platform/domains", { silent: true }),
        api("/platform/companies", { silent: true }),
      ]);
      setItems(d.data || []);
      setCompanies(c.data || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openRegister = () => {
    setForm({
      companyId: companies[0]?._id || "",
      slug: companies[0]?.slug || "",
      type: "subdomain",
      hostname: "",
      isPrimary: true,
      status: "pending",
      notes: "",
    });
    setOpen(true);
  };

  const onCompanyChange = (id) => {
    const c = companies.find((x) => x._id === id);
    setForm((p) => ({ ...p, companyId: id, slug: c?.slug || "" }));
  };

  const previewHost =
    form.type === "subdomain"
      ? `${(form.slug || "slug").toLowerCase()}.${BASE}`
      : form.hostname || "custom.example.com";

  const save = async () => {
    try {
      await api("/platform/domains", {
        method: "POST",
        body: {
          companyId: form.companyId,
          slug: form.slug,
          type: form.type,
          hostname: form.type === "custom" ? form.hostname : undefined,
          isPrimary: form.isPrimary,
          status: form.status,
          notes: form.notes,
        },
        successMessage: "Domain registered",
      });
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const setStatus = async (domain, status) => {
    try {
      await api(`/platform/domains/${domain._id}`, {
        method: "PUT",
        body: { status },
        successMessage: `Domain ${status}`,
      });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (domain) => {
    if (!confirm(`Remove ${domain.hostname}?`)) return;
    try {
      await api(`/platform/domains/${domain._id}`, {
        method: "DELETE",
        successMessage: "Domain removed",
      });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Company Domains"
        subtitle="Register subdomain or custom domain — activate only after DNS/SSL"
        actions={
          <button type="button" className="btn btn-primary" onClick={openRegister}>
            Register Domain
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
                  <th>Company</th>
                  <th>Hostname</th>
                  <th>Type</th>
                  <th>Primary</th>
                  <th>Status</th>
                  <th>SSL</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ color: "var(--muted)" }}>
                      No domains yet. Register one for a pharmacy company.
                    </td>
                  </tr>
                ) : (
                  items.map((d) => (
                    <tr key={d._id}>
                      <td>
                        <strong>{d.companyId?.name || "-"}</strong>
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>{d.companyId?.slug}</div>
                      </td>
                      <td>
                        <div style={{ display: "grid", gap: 4 }}>
                          <a
                            href={pharmacyLiveUrl(d.companyId?.slug)}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontWeight: 600 }}
                          >
                            Open pharmacy login
                          </a>
                          <code style={{ fontSize: 12 }}>{d.hostname}</code>
                          <a
                            href={pharmacySubdomainUrl(d.companyId?.slug)}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 12, color: "var(--muted)" }}
                          >
                            {pharmacySubdomainUrl(d.companyId?.slug)}
                          </a>
                        </div>
                      </td>
                      <td>{d.type}</td>
                      <td>{d.isPrimary ? "Yes" : "No"}</td>
                      <td>
                        <span className={`badge badge-${d.status === "active" ? "success" : "warning"}`}>
                          {d.status}
                        </span>
                      </td>
                      <td>{d.sslStatus}</td>
                      <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <a
                          className="btn btn-primary"
                          href={pharmacyLiveUrl(d.companyId?.slug)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ textDecoration: "none" }}
                        >
                          Open
                        </a>
                        {d.status !== "active" ? (
                          <button type="button" className="btn btn-ghost" onClick={() => setStatus(d, "active")}>
                            Activate
                          </button>
                        ) : (
                          <button type="button" className="btn btn-ghost" onClick={() => setStatus(d, "inactive")}>
                            Deactivate
                          </button>
                        )}
                        <button type="button" className="btn btn-ghost" onClick={() => remove(d)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={open}
        title="Register Domain"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save}>
              Save Domain
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label>
            Company
            <select value={form.companyId} onChange={(e) => onCompanyChange(e.target.value)}>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.slug})
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
              <option value="subdomain">Subdomain</option>
              <option value="custom">Custom Domain</option>
            </select>
          </label>
          {form.type === "subdomain" ? (
            <label>
              Slug
              <input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase() }))} />
            </label>
          ) : (
            <label>
              Custom Hostname
              <input
                value={form.hostname}
                placeholder="pharmacy.example.com"
                onChange={(e) => setForm((p) => ({ ...p, hostname: e.target.value.toLowerCase() }))}
              />
            </label>
          )}
          <label>
            Status
            <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Preview
            <input value={previewHost} disabled />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Notes
            <input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </label>
        </div>
      </Modal>
    </div>
  );
}
