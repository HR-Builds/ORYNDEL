import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import Reveal from "../components/Reveal";

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api.get("/cart").then((r) => setCart(r.data)).catch(() => setError("Sign in to view your cart."));

  useEffect(() => {
    if (!localStorage.getItem("oryndel_token")) {
      navigate("/login");
      return;
    }
    load();
  }, []);

  const updateQty = async (item, qty) => {
    try {
      const r = await api.patch(`/cart/${item.id}`, { quantity: qty });
      setCart(r.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Update failed.");
    }
  };

  const remove = async (item) => {
    const r = await api.delete(`/cart/${item.id}`);
    setCart(r.data);
  };

  if (error) {
    return (
      <div className="cart-wrap">
        <p className="eyebrow">Cart</p>
        <h1 className="display" style={{ fontSize: "2.6rem", margin: "1rem 0 2rem" }}>Your cart</h1>
        <p className="empty-state">{error}</p>
      </div>
    );
  }

  if (!cart) return <p className="loading-state" style={{ paddingTop: "14rem" }}>Loading</p>;

  return (
    <div className="cart-wrap">
      <Reveal>
        <p className="eyebrow">Cart</p>
        <h1 className="display" style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)", margin: "0.8rem 0 2.4rem" }}>Your cart</h1>
      </Reveal>

      {cart.items.length === 0 ? (
        <>
          <p className="empty-state">Your cart is empty.</p>
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <Link to="/shop" className="btn btn-solid">Browse the Collection</Link>
          </div>
        </>
      ) : (
        <>
          {cart.items.map((item, i) => (
            <Reveal key={item.id} delay={i * 0.06}>
              <div className="cart-item">
                {item.product.image ? (
                  <img src={item.product.image} alt={item.product.name} />
                ) : (
                  <div className="cart-thumb-empty" />
                )}
                <div>
                  <p className="cart-item-name">{item.product.name}</p>
                  <p className="cart-item-price">PKR {Number(item.product.price).toLocaleString()} each</p>
                </div>
                <div className="qty-row" style={{ margin: 0 }}>
                  <button className="qty-btn" onClick={() => updateQty(item, item.quantity - 1)}>−</button>
                  <span className="qty-val">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQty(item, item.quantity + 1)}>+</button>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontFamily: "var(--serif)", fontSize: "1.2rem", color: "var(--gold)", marginBottom: "0.6rem" }}>
                    PKR {(Number(item.product.price) * item.quantity).toLocaleString()}
                  </p>
                  <button className="mini-btn danger" onClick={() => remove(item)}>Remove</button>
                </div>
              </div>
            </Reveal>
          ))}

          <Reveal>
            <div className="cart-total-row">
              <span style={{ letterSpacing: "0.25em", textTransform: "uppercase", fontSize: "0.7rem", color: "var(--muted)" }}>
                Subtotal
              </span>
              <strong>PKR {Number(cart.total).toLocaleString()}</strong>
              <Link to="/checkout" className="btn btn-solid">Proceed to Checkout</Link>
            </div>
          </Reveal>
        </>
      )}
    </div>
  );
}