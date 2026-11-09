import PageHeader from "../../components/ui/PageHeader";

export default function PlatformPlaceholderPage({ title, subtitle, nextStep }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle || "MedAxis Control Center module"} />
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginTop: 0, color: "#17243B" }}>In progress</h3>
        <p style={{ color: "#6B7A99", marginBottom: 0 }}>
          {nextStep ||
            "This platform module is scaffolded. Pharmacy tenants cannot see or access this screen."}
        </p>
      </div>
    </div>
  );
}
