import CrudPage from "../_shared/CrudPage";

export default function SuppliersPage() {
  return (
    <CrudPage
      title="Suppliers"
      subtitle="Manage pharmacy suppliers"
      endpoint="/suppliers"
      columns={[
        { key: "name", label: "Name" },
        { key: "contactPerson", label: "Contact" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "outstandingBalance", label: "Balance" },
      ]}
      fields={[
        { name: "name", label: "Supplier Name" },
        { name: "companyName", label: "Company" },
        { name: "contactPerson", label: "Contact Person" },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email" },
        { name: "address", label: "Address", full: true },
      ]}
    />
  );
}
