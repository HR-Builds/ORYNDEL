import { useEffect, useState } from "react";
import api from "../../api/client";

export default function AdminPromos() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ code: "", discount_percent: 10, active: true });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/admin/promos").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("code", form.code);
      fd.append("discount_percent", form.discount_percent);
      fd.append("active", form.active);
      await api.post("/admin/promos", fd);
      setForm({ code: "", discount_percent: 10, active: true });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create promo code.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete promo code "${p.code}"?`)) return;
    await api.delete(`/admin/promos/${p.id}`);
    load();
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">Marketing</p>
          <h2>Promo Codes</h2>
        </div>
      </div>

      <div className="panel">
        <h3>Create Promo Code</h3>
        <form className="admin-form" onSubmit={submit}>
          <div className="field">
            <label className="label">Code *</label>
            <input
              className="input"
              required
              placeholder="SUMMER25"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />
          </div>
          <div className="field">
            <label className="label">Discount % (1–90) *</label>
            <input
              className="input"
              type="number"
              min="1"
              max="90"
              required
              value={form.discount_percent}
              onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
            />
          </div>
          <div className="field full">
            <label className="check-row" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Active (customers can use it immediately)
            </label>
          </div>
          {error && <p className="error-text full">{error}</p>}
          <div className="full">
            <button className="btn btn-solid" disabled={busy || !form.code.trim()}>
              {busy ? "Creating" : "Create Promo Code"}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h3>All Codes</h3>
        {items.length === 0 ? (
          <p className="file-hint">No promo codes yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Code</th><th>Discount</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: "var(--serif)", fontSize: "1.15rem", color: "var(--gold)", letterSpacing: "0.1em" }}>
                      {p.code}
                    </td>
                    <td>{p.discount_percent}%</td>
                    <td>
                      <span className={`badge ${p.active ? "green" : "red"}`}>
                        {p.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td>
                      <button className="mini-btn danger" onClick={() => remove(p)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}