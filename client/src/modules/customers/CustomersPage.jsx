import CrudPage from "../_shared/CrudPage";

export default function CustomersPage() {
  return (
    <CrudPage
      title="Customers"
      subtitle="Customer directory and spending"
      endpoint="/customers"
      columns={[
        { key: "name", label: "Name" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "totalSpending", label: "Total Spending" },
      ]}
      fields={[
        { name: "name", label: "Customer Name" },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email" },
        { name: "address", label: "Address", full: true },
      ]}
      mapItem={(item) => ({
        ...item,
        totalSpending: `$${Number(item.totalSpending || 0).toFixed(2)}`,
      })}
    />
  );
}
