import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";

export default function PermissionsPage() {
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/permissions")
      .then((res) => setGrouped(res.data.grouped || {}))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Permissions" subtitle="System permission catalog" />
      {loading ? (
        <Skeleton />
      ) : (
        <div className="two-col">
          {Object.entries(grouped).map(([module, perms]) => (
            <div className="card" key={module}>
              <h3 style={{ textTransform: "capitalize" }}>{module}</h3>
              <ul>
                {perms.map((p) => (
                  <li key={p._id}>
                    <code>{p.key}</code> — {p.description}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
