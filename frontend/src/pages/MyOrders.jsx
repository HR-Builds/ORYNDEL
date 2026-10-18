import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import Reveal from "../components/Reveal";

const STATUS_CLASS = {
  pending: "gold", confirmed: "green", shipped: "green",
  delivered: "green", cancelled: "red", refunded: "red",
};

export default function MyOrders() {
  const [orders, setOrders] = useState(null);

  const load = () => api.get("/orders").then((r) => setOrders(r.data));
  useEffect(() => { load(); }, []);

  const cancel = async (o) => {
    if (!window.confirm(`Cancel order ${o.order_number}?`)) return;
    await api.post(`/orders/${o.id}/cancel`);
    load();
  };

  if (!orders) return <p className="loading-state" style={{ paddingTop: "14rem" }}>Loading</p>;

  return (
    <div className="cart-wrap">
      <Reveal>
        <p className="eyebrow">Account</p>
        <h1 className="display" style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)", margin: "0.8rem 0 2.4rem" }}>My Orders</h1>
      </Reveal>

      {orders.length === 0 ? (
        <>
          <p className="empty-state">No orders yet.</p>
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <Link to="/shop" className="btn btn-solid">Start Shopping</Link>
          </div>
        </>
      ) : (
        orders.map((o, i) => (
          <Reveal key={o.id} delay={Math.min(i * 0.06, 0.4)}>
            <div className="order-card">
              <div className="order-card-head">
                <span className="order-card-num">{o.order_number}</span>
                <span className={`badge ${STATUS_CLASS[o.status] || ""}`}>{o.status}</span>
              </div>
              <p className="order-card-meta">
                {new Date(o.created_at).toLocaleDateString()} · {o.payment_method === "cod" ? "Cash on Delivery" : "Bank Transfer"}
                {o.fraud_flag && <span style={{ color: "#d98a97" }}> · Under review</span>}
              </p>
              <p className="order-card-meta">
                {o.items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: "1.3rem", color: "var(--gold)" }}>
                  PKR {Number(o.total_amount).toLocaleString()}
                </span>
                {o.status === "pending" && (
                  <button className="mini-btn danger" onClick={() => cancel(o)}>Cancel Order</button>
                )}
              </div>
            </div>
          </Reveal>
        ))
      )}
    </div>
  );
}