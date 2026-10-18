import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/register", form);
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">Join ORYNDEL</p>
        <h1>Create account</h1>
        <div className="field">
          <label className="label">Full Name</label>
          <input className="input" required value={form.username} onChange={set("username")} />
        </div>
        <div className="field">
          <label className="label">Email</label>
          <input className="input" type="email" required value={form.email} onChange={set("email")} />
        </div>
        <div className="field">
          <label className="label">Password (min 8 characters)</label>
          <input className="input" type={show ? "text" : "password"} required minLength={8} value={form.password} onChange={set("password")} />
        </div>
        <label className="check-row">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          Show password
        </label>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-solid btn-block" disabled={busy}>
          {busy ? "Creating account" : "Create Account"}
        </button>
        <div className="auth-links">
          <Link to="/login">Already have an account?</Link>
        </div>
      </form>
    </div>
  );
}