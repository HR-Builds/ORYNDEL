import { useEffect, useState } from "react";
import api from "../../api/client";

const AGENTS = [
  ["", "All Agents"],
  ["refund", "Refund & Escalation"],
  ["recommendations", "Recommendations"],
  ["pricing", "Pricing Auditor"],
  ["fraud", "Fraud Detection"],
  ["onboarding", "SEO Onboarding"],
];

const STATUS_CLASS = {
  running: "gold",
  success: "green",
  failed: "red",
  awaiting_review: "red",
};

export default function AdminAgents() {
  const [runs, setRuns] = useState([]);
  const [agent, setAgent] = useState("");
  const [flagged, setFlagged] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [pricingProduct, setPricingProduct] = useState("");
  const [pricingResult, setPricingResult] = useState("");
  const [onboardName, setOnboardName] = useState("");
  const [onboardFile, setOnboardFile] = useState(null);
  const [onboardResult, setOnboardResult] = useState(null);
  const [message, setMessage] = useState("");

  const refresh = () => {
    api.get("/admin/agent-runs", { params: { agent: agent || undefined, limit: 100 } })
      .then((r) => {
        setRuns(r.data);
        setPendingReviews(r.data.filter((x) => x.agent === "refund" && x.status === "awaiting_review"));
      });
  };

  useEffect(() => { refresh(); }, [agent]);
  useEffect(() => {
    api.get("/admin/orders", { params: { fraud_only: true, limit: 50 } })
      .then((r) => setFlagged(r.data.items));
    api.get("/admin/products", { params: { limit: 100 } })
      .then((r) => setProducts(r.data.items));
  }, []);

  const review = async (runId, approve) => {
    const r = await api.post(`/admin/agents/refunds/${runId}/${approve ? "approve" : "reject"}`);
    setMessage(r.data.message);
    refresh();
  };

  const runPricing = async () => {
    setMessage("");
    setPricingResult("Auditor agent is searching competitor prices...");
    try {
      const r = await api.post(`/admin/agents/pricing/run?product_id=${pricingProduct}`);
      setPricingResult(r.data.suggestion);
    } catch (e) {
      setPricingResult(e.response?.data?.detail || "Pricing agent failed.");
    }
    refresh();
  };

  const runOnboard = async (e) => {
    e.preventDefault();
    if (!onboardFile) return;
    setMessage("");
    const fd = new FormData();
    fd.append("name", onboardName);
    fd.append("file", onboardFile);
    try {
      const r = await api.post("/admin/agents/onboard", fd);
      setOnboardResult(r.data);
    } catch (err) {
      setMessage(err.response?.data?.detail || "Onboarding agent failed.");
    }
    refresh();
  };

  const applyOnboard = async () => {
    const r = await api.post("/admin/products", {
      name: onboardResult.name,
      category: onboardResult.category,
      price: 1000,
      stock: 1,
      description: onboardResult.description,
      seo_tags: onboardResult.seo_tags,
    });
    const fd = new FormData();
    fd.append("file", onboardFile);
    await api.post(`/admin/products/${r.data.id}/image`, fd);
    setMessage("Product created from agent draft. Update price/stock in Products.");
    setOnboardResult(null);
    setOnboardName("");
    setOnboardFile(null);
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">Automation</p>
          <h2>AI Agents</h2>
        </div>
      </div>

      {message && <p className="inline-msg" style={{ marginBottom: "1.5rem" }}>{message}</p>}

      <div className="panel">
        <h3>Refund Requests Awaiting Your Review</h3>
        {pendingReviews.length === 0 ? (
          <p className="file-hint">No pending reviews. Small, policy-compliant refunds are auto-approved by Agent 1.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Task</th><th>Received</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pendingReviews.map((run) => (
                  <tr key={run.id}>
                    <td style={{ fontFamily: "var(--serif)", fontSize: "1.1rem" }}>{run.task}</td>
                    <td style={{ whiteSpace: "nowrap", color: "var(--muted)", fontSize: "0.78rem" }}>
                      {new Date(run.created_at).toLocaleString()}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="mini-btn" onClick={() => review(run.id, true)}>Approve Refund</button>
                        <button className="mini-btn danger" onClick={() => review(run.id, false)}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Agent 3 — Competitor Pricing Auditor</h3>
        <div className="row-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
          <select className="status-select" value={pricingProduct} onChange={(e) => setPricingProduct(e.target.value)}>
            <option value="">Select a product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — PKR {Number(p.price).toLocaleString()}</option>
            ))}
          </select>
          <button className="btn" onClick={runPricing} disabled={!pricingProduct}>Run Auditor</button>
        </div>
        {pricingResult && <p className="run-result" style={{ maxWidth: "100%" }}>{pricingResult}</p>}
      </div>

      <div className="panel">
        <h3>Agent 5 — Product Onboarding & SEO</h3>
        {!onboardResult ? (
          <form onSubmit={runOnboard} className="admin-form">
            <div className="field">
              <label className="label">Product Name *</label>
              <input className="input" required value={onboardName} onChange={(e) => setOnboardName(e.target.value)} placeholder="Onyx Wool Overcoat" />
            </div>
            <div className="field">
              <label className="label">Product Photo *</label>
              <label className="file-btn" htmlFor="onboard-img">Choose Image</label>
              <input id="onboard-img" className="file-input-hidden" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setOnboardFile(e.target.files[0] || null)} />
              <p className="file-hint">{onboardFile ? onboardFile.name : "Agent writes description, tags and category"}</p>
            </div>
            <div className="full">
              <button className="btn btn-solid" disabled={!onboardFile || !onboardName.trim()}>Generate Listing</button>
            </div>
          </form>
        ) : (
          <div>
            <div className="field">
              <label className="label">Category (agent picked)</label>
              <input className="input" value={onboardResult.category} onChange={(e) => setOnboardResult({ ...onboardResult, category: e.target.value })} />
            </div>
            <div className="field">
              <label className="label">SEO Tags</label>
              <input className="input" value={onboardResult.seo_tags} onChange={(e) => setOnboardResult({ ...onboardResult, seo_tags: e.target.value })} />
            </div>
            <div className="field">
              <label className="label">Description</label>
              <textarea className="input" rows="5" value={onboardResult.description} onChange={(e) => setOnboardResult({ ...onboardResult, description: e.target.value })} />
            </div>
            <div className="row-actions">
              <button className="btn btn-solid" onClick={applyOnboard}>Create Product</button>
              <button className="btn btn-ghost" onClick={() => setOnboardResult(null)}>Discard</button>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Fraud Flagged Orders</h3>
        {flagged.length === 0 ? (
          <p className="file-hint">No flagged orders. Every order is passing the screening pipeline.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Order #</th><th>Customer</th><th>Score</th><th>Date</th></tr>
              </thead>
              <tbody>
                {flagged.map((o) => (
                  <tr key={o.id}>
                    <td>{o.order_number}</td>
                    <td>{o.email}</td>
                    <td><span className="badge red">{o.fraud_score}</span></td>
                    <td>{new Date(o.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Agent Activity Log</h3>
        <div className="field agents-filter">
          <select className="select" value={agent} onChange={(e) => setAgent(e.target.value)}>
            {AGENTS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Time</th><th>Agent</th><th>Task</th><th>Status</th><th>Result</th></tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(run.created_at).toLocaleString()}</td>
                  <td><span className="badge gold">{run.agent}</span></td>
                  <td>{run.task}</td>
                  <td><span className={`badge ${STATUS_CLASS[run.status] || ""}`}>{run.status.replace("_", " ")}</span></td>
                  <td className="run-result">{run.result || "—"}</td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr><td colSpan="5" style={{ color: "var(--muted)" }}>No activity yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}