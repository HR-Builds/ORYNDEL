import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get("email") || "";
  const [form, setForm] = useState({ otp: "", new_password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) =>
    setForm({ ...form, [key]: key === "otp" ? e.target.value.replace(/\D/g, "") : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { email, ...form });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.detail || "Reset failed. Check your code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">Account Recovery</p>
        <h1>Reset password</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.8rem", lineHeight: 1.7 }}>
          Enter the code sent to <span style={{ color: "var(--gold)" }}>{email}</span> and choose a new password.
        </p>
        <div className="field">
          <label className="label">Reset Code</label>
          <input className="otp-input" maxLength={6} inputMode="numeric" required value={form.otp} onChange={set("otp")} />
        </div>
        <div className="field">
          <label className="label">New Password (min 8 characters)</label>
          <input className="input" type={show ? "text" : "password"} required minLength={8} value={form.new_password} onChange={set("new_password")} />
        </div>
        <label className="check-row">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          Show password
        </label>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-solid btn-block" disabled={busy || form.otp.length !== 6}>
          {busy ? "Updating" : "Update Password"}
        </button>
        <div className="auth-links">
          <Link to="/login">Back to sign in</Link>
        </div>
      </form>
    </div>
  );
}