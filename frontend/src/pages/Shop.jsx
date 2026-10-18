import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";
import Reveal from "../components/Reveal";

const CATEGORIES = ["all", "clothing", "footwear", "accessories", "fragrance", "cosmetics"];
const SORTS = [
  ["newest", "Newest"],
  ["price_low", "Price: Low to High"],
  ["price_high", "Price: High to Low"],
  ["name", "Name"],
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(params.get("search") || "");
  const [minInput, setMinInput] = useState("");
  const [maxInput, setMaxInput] = useState("");
  const [applied, setApplied] = useState({ search: params.get("search") || "", min: "", max: "" });
  const [loading, setLoading] = useState(true);

  const category = params.get("category") || "all";
  const sort = params.get("sort") || "newest";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/products", {
          params: {
            category: category === "all" ? undefined : category,
            search: applied.search || undefined,
            min_price: applied.min || undefined,
            max_price: applied.max || undefined,
            sort,
            page,
            limit: 12,
          },
        });
        setData(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [category, sort, page, applied]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    setParams(next);
    setPage(1);
  };

  const applyFilters = (e) => {
    e.preventDefault();
    setApplied({ search: searchInput.trim(), min: minInput, max: maxInput });
    setPage(1);
  };

  return (
    <>
      <header className="page-head">
        <Reveal>
          <p className="eyebrow">The Collection</p>
          <h1>Shop</h1>
        </Reveal>
      </header>

      <form className="filters" onSubmit={applyFilters}>
        <div className="field">
          <label className="label">Category</label>
          <select className="select" value={category} onChange={(e) => updateParam("category", e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c === "all" ? "All Categories" : c[0].toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Sort By</label>
          <select className="select" value={sort} onChange={(e) => updateParam("sort", e.target.value)}>
            {SORTS.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Search</label>
          <input
            className="input"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Jacket, oud, leather..."
          />
        </div>
        <div className="field" style={{ maxWidth: "120px" }}>
          <label className="label">Min PKR</label>
          <input className="input" type="number" min="0" value={minInput} onChange={(e) => setMinInput(e.target.value)} />
        </div>
        <div className="field" style={{ maxWidth: "120px" }}>
          <label className="label">Max PKR</label>
          <input className="input" type="number" min="0" value={maxInput} onChange={(e) => setMaxInput(e.target.value)} />
        </div>
        <button className="btn" type="submit">Apply</button>
      </form>

      <section className="shop-grid-wrap">
        {loading ? (
          <p className="loading-state">Loading</p>
        ) : data.items.length === 0 ? (
          <p className="empty-state">Nothing found. Adjust your filters.</p>
        ) : (
          <div className="grid">
            {data.items.map((p, i) => (
              <Reveal key={p.id} delay={Math.min(i * 0.06, 0.4)}>
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

        {data.pages > 1 && (
          <div className="pagination">
            <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
            <span className="page-num">{page} / {data.pages}</span>
            <button className="btn" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </section>
    </>
  );
}