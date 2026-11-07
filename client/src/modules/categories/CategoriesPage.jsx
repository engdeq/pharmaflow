import CrudPage from "../_shared/CrudPage";

export default function CategoriesPage() {
  return (
    <CrudPage
      title="Categories"
      subtitle="Organize medicines by category"
      endpoint="/categories"
      columns={[
        { key: "name", label: "Name" },
        { key: "description", label: "Description" },
        { key: "medicinesCount", label: "Medicines" },
        { key: "status", label: "Status" },
      ]}
      fields={[
        { name: "name", label: "Name" },
        { name: "icon", label: "Icon", defaultValue: "Tag" },
        { name: "description", label: "Description", type: "textarea", full: true },
      ]}
      mapItem={(item) => ({
        ...item,
        medicinesCount: item.medicinesCount ?? 0,
        status: item.isActive ? "Active" : "Inactive",
      })}
    />
  );
}
