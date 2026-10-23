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

  // Recommendation Agent state
  const [recommendationQuery, setRecommendationQuery] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");

  const refresh = () => {
    api
      .get("/admin/agent-runs", {
        params: { agent: agent || undefined, limit: 100 },
      })
      .then((r) => {
        setRuns(r.data);
        setPendingReviews(
          r.data.filter(
            (x) => x.agent === "refund" && x.status === "awaiting_review",
          ),
        );
      })
      .catch((e) => {
        console.error("Could not load agent activity:", e);
      });
  };

  useEffect(() => {
    refresh();
  }, [agent]);

  useEffect(() => {
    api
      .get("/admin/orders", { params: { fraud_only: true, limit: 50 } })
      .then((r) => setFlagged(r.data.items))
      .catch((e) => console.error("Could not load flagged orders:", e));

    api
      .get("/admin/products", { params: { limit: 100 } })
      .then((r) => setProducts(r.data.items))
      .catch((e) => console.error("Could not load products:", e));
  }, []);

  const review = async (runId, approve) => {
    try {
      const r = await api.post(
        `/admin/agents/refunds/${runId}/${approve ? "approve" : "reject"}`,
      );
      setMessage(r.data.message);
      refresh();
    } catch (e) {
      setMessage(
        e.response?.data?.detail || "Could not process the refund review.",
      );
    }
  };

  const runRecommendations = async (e) => {
    e.preventDefault();

    const query = recommendationQuery.trim();
    if (!query || recommendationLoading) return;

    setRecommendationLoading(true);
    setRecommendationError("");
    setRecommendations([]);

    try {
      const r = await api.get("/recommendations", {
        params: { q: query },
      });

      const items = r.data?.items;

      if (!Array.isArray(items)) {
        throw new Error("The agent returned an unexpected response.");
      }

      setRecommendations(items);
    } catch (e) {
      setRecommendationError(
        e.response?.data?.detail ||
          e.message ||
          "Recommendation Agent failed. Please try again.",
      );
    } finally {
      setRecommendationLoading(false);
    }
  };

  const runPricing = async () => {
    setMessage("");
    setPricingResult("Auditor agent is searching competitor prices...");

    try {
      const r = await api.post(
        `/admin/agents/pricing/run?product_id=${pricingProduct}`,
      );
      setPricingResult(r.data.suggestion);
    } catch (e) {
      setPricingResult(
        `${e.response?.status || "Network"}: ${
          e.response?.data?.detail || e.message
        }`,
      );
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
    try {
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

      setMessage(
        "Product created from agent draft. Update price/stock in Products.",
      );
      setOnboardResult(null);
      setOnboardName("");
      setOnboardFile(null);
    } catch (e) {
      setMessage(
        e.response?.data?.detail || "Could not create the product.",
      );
    }
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">Automation</p>
          <h2>AI Agents</h2>
        </div>
      </div>

      {message && (
        <p className="inline-msg" style={{ marginBottom: "1.5rem" }}>
          {message}
        </p>
      )}

      {/* Recommendation Agent */}
      <div className="panel">
        <h3>Agent 2 — Product Recommendations</h3>
        <p className="file-hint" style={{ marginBottom: "1rem" }}>
          Enter a shopping query to find matching active products from your
          catalogue.
        </p>

        <form
          onSubmit={runRecommendations}
          className="row-actions"
          style={{
            marginBottom: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            className="input"
            style={{ flex: "1 1 260px", minWidth: 0 }}
            value={recommendationQuery}
            onChange={(e) => setRecommendationQuery(e.target.value)}
            placeholder="e.g. warm jacket and shoes"
            aria-label="Product recommendation search"
            required
          />

          <button
            type="submit"
            className="btn btn-solid"
            disabled={
              recommendationLoading || !recommendationQuery.trim()
            }
          >
            {recommendationLoading
              ? "Searching..."
              : "Run Recommendations"}
          </button>
        </form>

        {recommendationLoading && (
          <p className="file-hint">
            Recommendation Agent is analysing your query and searching
            products...
          </p>
        )}

        {recommendationError && (
          <p
            className="inline-msg"
            role="alert"
            style={{ marginBottom: "1rem" }}
          >
            {recommendationError}
          </p>
        )}

        {!recommendationLoading &&
          !recommendationError &&
          recommendations.length === 0 && (
            <p className="file-hint">
              Enter a query and run the agent to see matching products.
            </p>
          )}

        {recommendations.length > 0 && (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                </tr>
              </thead>

              <tbody>
                {recommendations.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.category || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      PKR{" "}
                      {Number(product.price).toLocaleString("en-PK", {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="file-hint">
              {recommendations.length} matching product
              {recommendations.length === 1 ? "" : "s"} returned.
            </p>
          </div>
        )}

        {!recommendationLoading &&
          !recommendationError &&
          recommendationQuery.trim() &&
          recommendations.length === 0 && (
            <p className="file-hint">
              No matching products were returned. Try another search.
            </p>
          )}
      </div>

      {/* Refund Agent */}
      <div className="panel">
        <h3>Refund Requests Awaiting Your Review</h3>

        {pendingReviews.length === 0 ? (
          <p className="file-hint">
            No pending reviews. Small, policy-compliant refunds are
            auto-approved by Agent 1.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Received</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingReviews.map((run) => (
                  <tr key={run.id}>
                    <td
                      style={{
                        fontFamily: "var(--serif)",
                        fontSize: "1.1rem",
                      }}
                    >
                      {run.task}
                    </td>
                    <td
                      style={{
                        whiteSpace: "nowrap",
                        color: "var(--muted)",
                        fontSize: "0.78rem",
                      }}
                    >
                      {new Date(run.created_at).toLocaleString()}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="mini-btn"
                          onClick={() => review(run.id, true)}
                        >
                          Approve Refund
                        </button>
                        <button
                          className="mini-btn danger"
                          onClick={() => review(run.id, false)}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pricing Agent */}
      <div className="panel">
        <h3>Agent 3 — Competitor Pricing Auditor</h3>

        <div
          className="row-actions"
          style={{ marginBottom: "1rem", flexWrap: "wrap" }}
        >
          <select
            className="status-select"
            value={pricingProduct}
            onChange={(e) => setPricingProduct(e.target.value)}
          >
            <option value="">Select a product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — PKR {Number(p.price).toLocaleString()}
              </option>
            ))}
          </select>

          <button
            className="btn"
            onClick={runPricing}
            disabled={!pricingProduct}
          >
            Run Auditor
          </button>
        </div>

        {pricingResult && (
          <p className="run-result" style={{ maxWidth: "100%" }}>
            {pricingResult}
          </p>
        )}
      </div>

      {/* Product Onboarding Agent */}
      <div className="panel">
        <h3>Agent 5 — Product Onboarding &amp; SEO</h3>

        {!onboardResult ? (
          <form onSubmit={runOnboard} className="admin-form">
            <div className="field">
              <label className="label">Product Name *</label>
              <input
                className="input"
                required
                value={onboardName}
                onChange={(e) => setOnboardName(e.target.value)}
                placeholder="Onyx Wool Overcoat"
              />
            </div>

            <div className="field">
              <label className="label">Product Photo *</label>
              <label className="file-btn" htmlFor="onboard-img">
                Choose Image
              </label>
              <input
                id="onboard-img"
                className="file-input-hidden"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) =>
                  setOnboardFile(e.target.files?.[0] || null)
                }
              />
              <p className="file-hint">
                {onboardFile
                  ? onboardFile.name
                  : "Agent writes description, tags and category"}
              </p>
            </div>

            <div className="full">
              <button
                className="btn btn-solid"
                disabled={!onboardFile || !onboardName.trim()}
              >
                Generate Listing
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="field">
              <label className="label">Category (agent picked)</label>
              <input
                className="input"
                value={onboardResult.category || ""}
                onChange={(e) =>
                  setOnboardResult({
                    ...onboardResult,
                    category: e.target.value,
                  })
                }
              />
            </div>

            <div className="field">
              <label className="label">SEO Tags</label>
              <input
                className="input"
                value={onboardResult.seo_tags || ""}
                onChange={(e) =>
                  setOnboardResult({
                    ...onboardResult,
                    seo_tags: e.target.value,
                  })
                }
              />
            </div>

            <div className="field">
              <label className="label">Description</label>
              <textarea
                className="input"
                rows="5"
                value={onboardResult.description || ""}
                onChange={(e) =>
                  setOnboardResult({
                    ...onboardResult,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div className="row-actions">
              <button className="btn btn-solid" onClick={applyOnboard}>
                Create Product
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setOnboardResult(null)}
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fraud Agent */}
      <div className="panel">
        <h3>Fraud Flagged Orders</h3>

        {flagged.length === 0 ? (
          <p className="file-hint">
            No flagged orders. Every order is passing the screening pipeline.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Score</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {flagged.map((o) => (
                  <tr key={o.id}>
                    <td>{o.order_number}</td>
                    <td>{o.email}</td>
                    <td>
                      <span className="badge red">{o.fraud_score}</span>
                    </td>
                    <td>{new Date(o.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Agent Activity Log */}
      <div className="panel">
        <h3>Agent Activity Log</h3>

        <div className="field agents-filter">
          <select
            className="select"
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
          >
            {AGENTS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Agent</th>
                <th>Task</th>
                <th>Status</th>
                <th>Result</th>
              </tr>
            </thead>

            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {new Date(run.created_at).toLocaleString()}
                  </td>
                  <td>
                    <span className="badge gold">{run.agent}</span>
                  </td>
                  <td>{run.task}</td>
                  <td>
                    <span
                      className={`badge ${STATUS_CLASS[run.status] || ""}`}
                    >
                      {run.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="run-result">{run.result || "—"}</td>
                </tr>
              ))}

              {runs.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ color: "var(--muted)" }}>
                    No activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}