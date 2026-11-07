import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function POSPage() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [taxRate, setTaxRate] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  useEffect(() => {
    api("/customers")
      .then((res) => setCustomers(res.data || []))
      .catch(() => {});
    api("/settings")
      .then((res) => setTaxRate(res.data?.taxRate || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api(`/medicines/search?q=${encodeURIComponent(q)}`)
        .then((res) => setResults(res.data || []))
        .catch((err) => toast.error(err.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const addToCart = (med) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.medicineId === med._id);
      if (existing) {
        return prev.map((p) =>
          p.medicineId === med._id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [
        ...prev,
        {
          medicineId: med._id,
          name: med.name,
          unitPrice: med.sellingPrice,
          quantity: 1,
          available: med.availableQuantity,
        },
      ];
    });
  };

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    [cart]
  );
  const tax = ((subtotal - Number(discount || 0)) * taxRate) / 100;
  const total = Math.max(0, subtotal - Number(discount || 0) + tax);

  const completeSale = async () => {
    if (!cart.length) return toast.error("Cart is empty");
    setBusy(true);
    try {
      const res = await api("/sales", {
        method: "POST",
        body: {
          items: cart,
          customerId: customerId || undefined,
          discount: Number(discount || 0),
          paymentMethod,
        },
      });
      setLastSale(res.data);
      setCart([]);
      setDiscount(0);
      toast.success("Sale completed");
      setTimeout(() => window.print(), 300);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Point of Sale" subtitle="Barcode-ready pharmacy checkout" />
      <div className="two-col">
        <div className="card">
          <input
            className="search-input"
            style={{ width: "100%", marginBottom: 12 }}
            placeholder="Search medicine or scan barcode..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Stock</th>
                  <th>Price</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map((m) => (
                  <tr key={m._id}>
                    <td>{m.name}</td>
                    <td>{m.availableQuantity}</td>
                    <td>${Number(m.sellingPrice).toFixed(2)}</td>
                    <td>
                      <button type="button" className="btn btn-primary" onClick={() => addToCart(m)}>
                        Add
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" id="receipt-print">
          <h3>Cart</h3>
          <div className="stack-form" style={{ display: "grid", gap: 10 }}>
            <label>
              Customer
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.medicineId}>
                    <td>{item.name}</td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        max={item.available}
                        value={item.quantity}
                        style={{ width: 70 }}
                        onChange={(e) =>
                          setCart((prev) =>
                            prev.map((p) =>
                              p.medicineId === item.medicineId
                                ? { ...p, quantity: Number(e.target.value) }
                                : p
                            )
                          )
                        }
                      />
                    </td>
                    <td>${(item.unitPrice * item.quantity).toFixed(2)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() =>
                          setCart((prev) => prev.filter((p) => p.medicineId !== item.medicineId))
                        }
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="stack-form" style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <label>
              Discount
              <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </label>
            <label>
              Payment
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="split">Split</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: 16, lineHeight: 1.8 }}>
            <div>Subtotal: ${subtotal.toFixed(2)}</div>
            <div>Tax ({taxRate}%): ${tax.toFixed(2)}</div>
            <div>
              <strong>Total: ${total.toFixed(2)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 14 }}
            disabled={busy}
            onClick={completeSale}
          >
            {busy ? "Processing..." : "Complete Sale"}
          </button>

          {lastSale ? (
            <div style={{ marginTop: 16, fontSize: 13 }}>
              <strong>Receipt {lastSale.receiptNumber}</strong>
              <div>Cashier: {lastSale.cashier?.username}</div>
              <div>Total: ${Number(lastSale.total).toFixed(2)}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
