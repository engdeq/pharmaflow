import { useLocation } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import { titleFromPath } from "../../layouts/platformNav";

export default function PlatformPlaceholderPage() {
  const location = useLocation();
  const title = titleFromPath(location.pathname);

  return (
    <div>
      <PageHeader
        title={title}
        subtitle="MedAxis Control Center module — pharmacy tenants cannot access this screen"
      />
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginTop: 0, color: "#17243B" }}>Module ready for configuration</h3>
        <p style={{ color: "#6B7A99", marginBottom: 0 }}>
          This section is part of the enterprise navigation. Core data pages (Companies, Domains,
          Menus, Plans, Billing, Users) are fully wired; this screen is reserved for the next
          implementation slice.
        </p>
      </div>
    </div>
  );
}
