import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";

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
      logo: "",
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
        subtitle="Magaca iyo logo — midabada waxaa maamula Platform (color template)"
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
