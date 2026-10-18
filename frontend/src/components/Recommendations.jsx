import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import Reveal from "./Reveal";

export default function Recommendations() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const r = await api.get("/recommendations", { params: { q: query } });
      setItems(r.data.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section-tight">
      <Reveal>
        <p className="eyebrow" style={{ marginBottom: "0.8rem" }}>AI Assistant</p>
        <h2 className="display" style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", marginBottom: "1rem" }}>
          Ask for anything
        </h2>
        <p style={{ color: "var(--muted)", maxWidth: "460px", lineHeight: 1.8, fontSize: "0.9rem" }}>
          Describe what you need in plain words. Our recommendation agent splits
          your request into parallel searches and merges the best matches.
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        <form onSubmit={search} style={{ display: "flex", gap: "0.8rem", margin: "2rem 0 2.4rem", flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: "240px" }}
            placeholder='Try "warm jacket and boots under 15000"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-solid" disabled={loading}>{loading ? "Searching" : "Recommend"}</button>
        </form>
      </Reveal>

      {items && (
        <div className="grid">
          {items.length === 0 && <p className="empty-state">No matches found. Try different words.</p>}
          {items.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.06}>
              <Link to={`/product/${p.slug}`} className="card">
                <div className="card-media">
                  {p.image && <img src={p.image} alt={p.name} loading="lazy" />}
                </div>
                <div className="card-body">
                  <p className="card-cat">{p.category}</p>
                  <h3 className="card-name">{p.name}</h3>
                  <p className="card-price">PKR {Number(p.price).toLocaleString()}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}