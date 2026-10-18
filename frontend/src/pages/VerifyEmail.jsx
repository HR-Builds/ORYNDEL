import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get("email") || "";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/verify-email", { email, otp });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired code.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setMessage("");
    setError("");
    try {
      await api.post("/auth/resend-otp", { email, purpose: "verify_email" });
      setMessage("A new code has been sent to your email.");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not resend code.");
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={verify}>
        <p className="eyebrow">One last step</p>
        <h1>Verify your email</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.8rem", lineHeight: 1.7 }}>
          We sent a 6-digit code to <span style={{ color: "var(--gold)" }}>{email}</span>
        </p>
        <div className="field">
          <label className="label">Verification Code</label>
          <input
            className="otp-input"
            maxLength={6}
            inputMode="numeric"
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        {message && <p className="inline-msg">{message}</p>}
        <button className="btn btn-solid btn-block" disabled={busy || otp.length !== 6}>
          {busy ? "Verifying" : "Verify Email"}
        </button>
        <div className="auth-links">
          <a onClick={resend} style={{ cursor: "none" }}>Resend code</a>
          <Link to="/register">Wrong email? Go back</Link>
        </div>
      </form>
    </div>
  );
}