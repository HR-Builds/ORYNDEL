import { useState } from "react";
import api from "../api/client";
import Reveal from "../components/Reveal";

export default function Contact() {
  const [form, setForm] = useState({ first_name: "", last_name: "", number: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/contact", form);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Message failed to send.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="contact-grid">
      <Reveal>
        <p className="eyebrow">Contact</p>
        <h1 className="display" style={{ fontSize: "clamp(2.4rem, 5vw, 3.8rem)", margin: "0.8rem 0 1.6rem" }}>Get in touch</h1>
        <div className="contact-info">
          <p>Questions about an order, a product, or a return — write to us and we will respond within one business day.</p>
          <p>Email — <a href="mailto:dev.hassanrashid@gmail.com">dev.hassanrashid@gmail.com</a></p>
          <p>WhatsApp — <a href="https://wa.me/923242693485" target="_blank" rel="noreferrer">0324 2693485</a></p>
          <p>Cash on Delivery & Bank Transfer available across Pakistan.</p>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        {sent ? (
          <div className="panel" style={{ marginBottom: 0 }}>
            <h3 style={{ fontFamily: "var(--serif)", fontSize: "1.6rem" }}>Message received.</h3>
            <p style={{ color: "var(--muted)", lineHeight: 1.8 }}>We will get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.4rem" }}>
              <div className="field">
                <label className="label">First Name *</label>
                <input className="input" required value={form.first_name} onChange={set("first_name")} />
              </div>
              <div className="field">
                <label className="label">Last Name *</label>
                <input className="input" required value={form.last_name} onChange={set("last_name")} />
              </div>
            </div>
            <div className="field">
              <label className="label">Phone Number *</label>
              <input className="input" required value={form.number} onChange={set("number")} />
            </div>
            <div className="field">
              <label className="label">Email *</label>
              <input className="input" type="email" required value={form.email} onChange={set("email")} />
            </div>
            <div className="field">
              <label className="label">Message *</label>
              <textarea className="input" rows="5" required value={form.message} onChange={set("message")} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-solid btn-block" disabled={busy}>
              {busy ? "Sending" : "Send Message"}
            </button>
          </form>
        )}
      </Reveal>
    </div>
  );
}