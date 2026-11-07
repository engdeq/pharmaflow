import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Skeleton from "../../components/ui/Skeleton";
import { api } from "../../services/api";

export default function SalesPage() {
  const [data, setData] = useState({ items: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/sales")
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Sales History" subtitle="Completed pharmacy sales" />
      <div className="card">
        {loading ? (
          <Skeleton />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Customer</th>
                  <th>Cashier</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => (
                  <tr key={s._id}>
                    <td>{s.receiptNumber}</td>
                    <td>{s.customer?.name || "Walk-in"}</td>
                    <td>{s.cashier?.username}</td>
                    <td>{s.paymentMethod}</td>
                    <td>${Number(s.total).toFixed(2)}</td>
                    <td>{new Date(s.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
