import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import Reveal from "../components/Reveal";

const EMPTY = {
  first_name: "", last_name: "", email: "", phone_number: "",
  address: "", city: "", postal_code: "", country: "Pakistan", landmark: "",
};

export default function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [payment, setPayment] = useState("cod");
  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState(null);
  const [bank, setBank] = useState(null);
  const [proof, setProof] = useState(null);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  useEffect(() => {
    if (!localStorage.getItem("oryndel_token")) {
      navigate("/login");
      return;
    }
    api.get("/cart").then((r) => {
      if (r.data.items.length === 0) navigate("/cart");
      setCart(r.data);
    });
    api.get("/checkout/payment-methods").then((r) => setBank(r.data.bank));
  }, []);

  const applyPromo = async () => {
    setError("");
    try {
      const r = await api.get(`/checkout/validate-promo?code=${encodeURIComponent(promo)}`);
      setPromoApplied(r.data);
    } catch (err) {
      setPromoApplied(null);
      setError(err.response?.data?.detail || "Invalid promo code.");
    }
  };

  const total = cart
    ? Number(cart.total) * (1 - (promoApplied?.discount_percent || 0) / 100)
    : 0;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = { ...form, payment_method: payment };
      if (promoApplied) payload.promo_code = promoApplied.code;
      const r = await api.post("/checkout", payload);
      if (payment === "bank_transfer" && proof) {
        const fd = new FormData();
        fd.append("file", proof);
        await api.post(`/checkout/${r.data.id}/payment-proof`, fd);
      }
      setOrder(r.data);
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.response?.data?.detail || "Checkout failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (order) {
    return (
      <div className="order-success">
        <p className="eyebrow">Order Placed</p>
        <h1>Thank you, {order.first_name}.</h1>
        <p className="order-num">{order.order_number}</p>
        <p style={{ color: "var(--muted)", maxWidth: "420px", lineHeight: 1.8, margin: "1.2rem 0 2.4rem" }}>
          {order.payment_method === "cod"
            ? "Pay in cash when your order arrives. We will contact you on your phone to confirm."
            : "We will verify your bank transfer and confirm your order shortly."}
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link to="/orders" className="btn btn-solid">View My Orders</Link>
          <Link to="/shop" className="btn btn-ghost">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  if (!cart) return <p className="loading-state" style={{ paddingTop: "14rem" }}>Loading</p>;

  return (
    <form className="checkout-grid" onSubmit={submit}>
      <Reveal>
        <p className="eyebrow">Checkout</p>
        <h1 className="display" style={{ fontSize: "clamp(2.2rem, 5vw, 3.4rem)", margin: "0.8rem 0 2rem" }}>Details</h1>

        <div className="field">
          <label className="label">First Name *</label>
          <input className="input" required value={form.first_name} onChange={set("first_name")} />
        </div>
        <div className="field">
          <label className="label">Last Name *</label>
          <input className="input" required value={form.last_name} onChange={set("last_name")} />
        </div>
        <div className="field">
          <label className="label">Email *</label>
          <input className="input" type="email" required value={form.email} onChange={set("email")} />
        </div>
        <div className="field">
          <label className="label">Phone Number *</label>
          <input className="input" required placeholder="03xxxxxxxxx" value={form.phone_number} onChange={set("phone_number")} />
        </div>
        <div className="field">
          <label className="label">Street Address *</label>
          <input className="input" required value={form.address} onChange={set("address")} />
        </div>
        <div className="field">
          <label className="label">City *</label>
          <input className="input" required value={form.city} onChange={set("city")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.4rem" }}>
          <div className="field">
            <label className="label">Postal Code *</label>
            <input className="input" required value={form.postal_code} onChange={set("postal_code")} />
          </div>
          <div className="field">
            <label className="label">Country *</label>
            <input className="input" required value={form.country} onChange={set("country")} />
          </div>
        </div>
        <div className="field">
          <label className="label">Landmark (optional)</label>
          <input className="input" value={form.landmark} onChange={set("landmark")} />
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="panel" style={{ marginBottom: 0 }}>
          <h3 style={{ fontFamily: "var(--serif)", fontSize: "1.5rem", marginBottom: "1.2rem" }}>Order Summary</h3>
          {cart.items.map((i) => (
            <p key={i.id} style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
              {i.quantity} × {i.product.name}
            </p>
          ))}
          <hr className="hairline" style={{ margin: "1.2rem 0" }} />

          <label className="label">Promo Code</label>
          <div style={{ display: "flex", gap: "0.7rem", marginBottom: "1.4rem" }}>
            <input className="input" placeholder="WELCOME10" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} />
            <button type="button" className="btn" onClick={applyPromo} disabled={!promo}>Apply</button>
          </div>
          {promoApplied && (
            <p className="inline-msg" style={{ marginTop: "-0.8rem", marginBottom: "1rem" }}>
              {promoApplied.code} applied — {promoApplied.discount_percent}% off
            </p>
          )}

          <div className="pay-methods">
            <label className={`pay-method ${payment === "cod" ? "selected" : ""}`}>
              <input type="radio" name="pay" checked={payment === "cod"} onChange={() => setPayment("cod")} />
              <span className="pay-method-label">Cash on Delivery<small>Pay when your order arrives at your door.</small></span>
            </label>
            <label className={`pay-method ${payment === "bank_transfer" ? "selected" : ""}`}>
              <input type="radio" name="pay" checked={payment === "bank_transfer"} onChange={() => setPayment("bank_transfer")} />
              <span className="pay-method-label">Bank Transfer<small>Transfer to our account and upload the receipt.</small></span>
            </label>
          </div>

          {payment === "bank_transfer" && bank && (
            <div className="bank-box">
              <p>Bank: <span>{bank.bank_name}</span></p>
              <p>Account Title: <span>{bank.account_title}</span></p>
              <p>Account Number: <span>{bank.account_number}</span></p>
              <div style={{ marginTop: "1rem" }}>
                <label className="file-btn" htmlFor="proof">Upload Receipt</label>
                <input id="proof" className="file-input-hidden" type="file" accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => setProof(e.target.files[0] || null)} />
                <p className="file-hint">{proof ? proof.name : "JPG, PNG or WEBP"}</p>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", margin: "1.6rem 0" }}>
            <span style={{ letterSpacing: "0.2em", textTransform: "uppercase", fontSize: "0.7rem", color: "var(--muted)" }}>Total</span>
            <span style={{ fontFamily: "var(--serif)", fontSize: "1.6rem", color: "var(--gold)" }}>
              PKR {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>

          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-solid btn-block" disabled={busy}>
            {busy ? "Placing order" : "Place Order"}
          </button>
        </div>
      </Reveal>
    </form>
  );
}