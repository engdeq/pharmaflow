import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";

const COLOR_FIELDS = [
  ["primaryColor", "Primary Color"],
  ["secondaryColor", "Secondary Color"],
  ["sidebarColor", "Sidebar Color"],
  ["sidebarActiveColor", "Sidebar Active"],
  ["headerColor", "Header Color"],
  ["buttonColor", "Button Color"],
  ["backgroundColor", "Background Color"],
];

export default function BrandingPage() {
  const toast = useToast();
  const { loadSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    logo: "",
    branding: {
      pharmacyName: "",
      tagline: "",
      logo: "",
      primaryColor: "#748CF8",
      secondaryColor: "#5A6FD8",
      sidebarColor: "#FFFFFF",
      sidebarActiveColor: "#748CF8",
      headerColor: "#FFFFFF",
      buttonColor: "#748CF8",
      backgroundColor: "#F5F7FB",
    },
  });

  useEffect(() => {
    api("/branding", { silent: true })
      .then((res) => {
        const d = res.data || {};
        setForm({
          name: d.name || "",
          slug: d.slug || "",
          logo: d.logo || "",
          branding: { ...form.branding, ...(d.branding || {}) },
        });
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    try {
      await api("/branding", {
        method: "PUT",
        body: {
          name: form.name,
          logo: form.logo || form.branding.logo,
          branding: {
            ...form.branding,
            pharmacyName: form.branding.pharmacyName || form.name,
            logo: form.logo || form.branding.logo,
          },
        },
        successMessage: "Branding saved",
      });
      await loadSession();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Skeleton />;

  return (
    <div>
      <PageHeader
        title="Branding"
        subtitle="Magaca, logo iyo midabada systemkaaga — kaliya shirkaddaada"
        actions={
          <button type="button" className="btn btn-primary" onClick={save}>
            Save Branding
          </button>
        }
      />

      <div className="card" style={{ display: "grid", gap: 16 }}>
        <div className="form-grid">
          <label>
            Pharmacy Name
            <input
              value={form.name}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  name: e.target.value,
                  branding: { ...p.branding, pharmacyName: e.target.value },
                }))
              }
            />
          </label>
          <label>
            Pharmacy Code (login / subdomain)
            <input value={form.slug} disabled />
          </label>
          <label>
            Tagline
            <input
              value={form.branding.tagline || ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, branding: { ...p.branding, tagline: e.target.value } }))
              }
            />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Logo URL
            <input
              value={form.logo || form.branding.logo || ""}
              placeholder="https://... or uploaded path"
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  logo: e.target.value,
                  branding: { ...p.branding, logo: e.target.value },
                }))
              }
            />
          </label>
        </div>

        <h3 style={{ margin: 0 }}>Colors</h3>
        <div className="form-grid">
          {COLOR_FIELDS.map(([key, label]) => (
            <label key={key}>
              {label}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="color"
                  value={form.branding[key] || "#748CF8"}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, branding: { ...p.branding, [key]: e.target.value } }))
                  }
                />
                <input
                  value={form.branding[key] || ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, branding: { ...p.branding, [key]: e.target.value } }))
                  }
                />
              </div>
            </label>
          ))}
        </div>

        {(form.logo || form.branding.logo) && (
          <div>
            <div style={{ color: "var(--muted)", marginBottom: 8 }}>Logo preview</div>
            <img
              src={form.logo || form.branding.logo}
              alt="logo"
              style={{ maxHeight: 72, borderRadius: 12, border: "1px solid var(--border)" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
