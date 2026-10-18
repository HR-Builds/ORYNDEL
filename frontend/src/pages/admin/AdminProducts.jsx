import { useEffect, useState } from "react";
import api from "../../api/client";

const CATEGORIES = ["clothing", "footwear", "accessories", "fragrance", "cosmetics"];

const EMPTY = {
  name: "", category: "clothing", price: "", stock: 0,
  description: "", seo_tags: "", is_active: true,
};

export default function AdminProducts() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get("/admin/products", { params: { search: search || undefined, limit: 100 } })
      .then((r) => setItems(r.data.items));

  useEffect(() => { load(); }, []);

  const set = (key) => (e) =>
    setForm({ ...form, [key]: e.target.value });

  const pickFile = (e) => {
    const f = e.target.files[0];
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : "");
  };

  const reset = () => {
    setForm(EMPTY);
    setFile(null);
    setPreview("");
    setEditingId(null);
    setError("");
  };

  const editItem = (p) => {
    setForm({
      name: p.name, category: p.category, price: String(p.price),
      stock: p.stock, description: p.description || "", seo_tags: p.seo_tags || "",
      is_active: p.is_active,
    });
    setPreview(p.image || "");
    setFile(null);
    setEditingId(p.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock) };
      let productId = editingId;
      if (editingId) {
        await api.put(`/admin/products/${editingId}`, payload);
      } else {
        const res = await api.post("/admin/products", payload);
        productId = res.data.id;
      }
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        await api.post(`/admin/products/${productId}/image`, fd);
      }
      reset();
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Save failed. Check all fields.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}" permanently?`)) return;
    await api.delete(`/admin/products/${p.id}`);
    load();
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">Catalog</p>
          <h2>Products</h2>
        </div>
      </div>

      <div className="panel">
        <h3>{editingId ? "Edit Product" : "Add Product"}</h3>
        <form className="admin-form" onSubmit={submit}>
          <div className="field">
            <label className="label">Product Name *</label>
            <input className="input" required value={form.name} onChange={set("name")} />
          </div>
          <div className="field">
            <label className="label">Category *</label>
            <select className="select" value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Price (PKR) *</label>
            <input className="input" type="number" min="1" required value={form.price} onChange={set("price")} />
          </div>
          <div className="field">
            <label className="label">Stock Quantity *</label>
            <input className="input" type="number" min="0" required value={form.stock} onChange={set("stock")} />
            <p className="file-hint">0 = shows Out of Stock automatically</p>
          </div>
          <div className="field full">
            <label className="label">Description</label>
            <textarea className="input" rows="4" value={form.description} onChange={set("description")} />
          </div>
          <div className="field full">
            <label className="label">SEO Tags (comma separated)</label>
            <input className="input" value={form.seo_tags} onChange={set("seo_tags")} placeholder="wool, overcoat, winter" />
          </div>
          <div className="field full">
            <label className="label">Product Image</label>
            <label className="file-btn" htmlFor="product-image">Choose Image</label>
            <input id="product-image" className="file-input-hidden" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={pickFile} />
            <p className="file-hint">JPG, PNG or WEBP from your PC</p>
            {preview && <img className="preview-img" src={preview} alt="Preview" />}
          </div>
          {error && <p className="error-text full">{error}</p>}
          <div className="full row-actions">
            <button className="btn btn-solid" disabled={busy}>{busy ? "Saving" : editingId ? "Update Product" : "Add Product"}</button>
            {editingId && <button type="button" className="btn btn-ghost" onClick={reset}>Cancel Edit</button>}
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="row-actions" style={{ marginBottom: "1.4rem" }}>
          <input className="input" style={{ maxWidth: "260px" }} placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="mini-btn" onClick={load}>Search</button>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{p.image ? <img className="thumb" src={p.image} alt="" /> : <div className="thumb-empty" />}</td>
                  <td>{p.name}</td>
                  <td><span className="badge">{p.category}</span></td>
                  <td>PKR {Number(p.price).toLocaleString()}</td>
                  <td>{p.stock}</td>
                  <td><span className={`badge ${p.is_active ? "green" : "red"}`}>{p.is_active ? "Live" : "Hidden"}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="mini-btn" onClick={() => editItem(p)}>Edit</button>
                      <button className="mini-btn danger" onClick={() => remove(p)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}